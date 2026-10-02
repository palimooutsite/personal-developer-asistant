import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  BillingSubscriptionProviderDto,
  CreateSubscriptionDto,
} from './dto/create-subscription.dto.js';

export interface BillingSubscriptionResponse {
  id: string;
  tenantId: string;
  packageId: string;
  packagePriceId: string;
  status: string;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSubscriptionDetailResponse extends BillingSubscriptionResponse {
  package: {
    id: string;
    code: string;
    name: string;
  };
  packagePrice: {
    id: string;
    billingPeriod: string;
    amountMinor: number;
    currency: string;
    version: number;
  };
}

export interface BillingSubscriptionMessageResponse {
  message: string;
}

@Injectable()
export class BillingSubscriptionService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async ensureTenantMember(tenantId: string, userId: string) {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();

    if (!member) {
      throw new NotFoundException('Workspace tidak ditemukan atau Anda bukan member workspace');
    }

    return member;
  }

  async getCurrent(
    tenantId: string,
    userId: string,
  ): Promise<BillingSubscriptionDetailResponse | null> {
    await this.ensureTenantMember(tenantId, userId);

    const subscriptions = await this.prisma.client.orm.public.TenantSubscription
      .where({ tenantId })
      .select(
        'id', 'tenantId', 'packageId', 'packagePriceId', 'status', 'provider',
        'providerCustomerId', 'providerSubscriptionId', 'startedAt',
        'currentPeriodStart', 'currentPeriodEnd', 'cancelledAt', 'createdAt', 'updatedAt',
      )
      .all();

    if (subscriptions.length === 0) return null;

    const subscription = subscriptions
      .filter((item) =>
        ['PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)),
      )
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

    if (!subscription) return null;

    return this.buildDetail(subscription);
  }

  async create(
    tenantId: string,
    userId: string,
    data: CreateSubscriptionDto,
  ): Promise<BillingSubscriptionDetailResponse> {
    await this.ensureTenantMember(tenantId, userId);

    const subscriptions = await this.prisma.client.orm.public.TenantSubscription
      .where({ tenantId })
      .select('id', 'status')
      .all();

    const activeSubscription = subscriptions.find((item) =>
      ['PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)),
    );

    if (activeSubscription) {
      throw new ConflictException('Workspace sudah memiliki subscription yang masih aktif');
    }

    const [pkg, price] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackage
        .where({ id: data.packageId })
        .first(),
      this.prisma.client.orm.public.SubscriptionPackagePrice
        .where({ id: data.packagePriceId })
        .first(),
    ]);

    if (!pkg) throw new NotFoundException('Package tidak ditemukan');
    if (!pkg.isActive) throw new ConflictException('Package sedang tidak aktif');
    if (!price) throw new NotFoundException('Harga package tidak ditemukan');

    if (price.packageId !== pkg.id) {
      throw new ConflictException('Harga package tidak sesuai dengan package yang dipilih');
    }

    if (!price.isActive) {
      throw new ConflictException('Harga package sedang tidak aktif');
    }

    const provider = data.provider ?? BillingSubscriptionProviderDto.SANDBOX;
    if (provider !== BillingSubscriptionProviderDto.SANDBOX) {
      throw new ConflictException(
        'Provider pembayaran selain SANDBOX belum tersedia pada tahap ini',
      );
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime());

    if (price.billingPeriod === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (price.billingPeriod === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      throw new ConflictException('Billing period tidak didukung');
    }

    const created = await this.prisma.client.orm.public.TenantSubscription.create({
      tenantId,
      packageId: pkg.id,
      packagePriceId: price.id,
      status: 'PENDING',
      provider,
      startedAt: now.toISOString(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
    });

    await this.auditService.create({ action: 'BILLING.SUBSCRIPTION_CREATED', entity: 'TenantSubscription', entityId: created.id, tenantId, userId, description: `Subscription ${pkg.code} dibuat`, metadata: { packageId: pkg.id, packagePriceId: price.id, provider } });
    return this.buildDetail(created);
  }

  async cancel(
    tenantId: string,
    userId: string,
  ): Promise<BillingSubscriptionMessageResponse> {
    await this.ensureTenantMember(tenantId, userId);

    const subscriptions = await this.prisma.client.orm.public.TenantSubscription
      .where({ tenantId })
      .select(
        'id', 'status', 'createdAt',
      )
      .all();

    const subscription = subscriptions
      .filter((item) => ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

    if (!subscription) {
      throw new NotFoundException('Tidak ada subscription aktif untuk workspace');
    }

    const updated = await this.prisma.client.orm.public.TenantSubscription
      .where({ id: subscription.id })
      .update({
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
      });

    if (!updated) {
      throw new NotFoundException('Subscription gagal dibatalkan');
    }

    await this.auditService.create({ action: 'BILLING.SUBSCRIPTION_CANCELLED', entity: 'TenantSubscription', entityId: subscription.id, tenantId, userId, description: 'Subscription dibatalkan' });
    return { message: 'Subscription berhasil dibatalkan' };
  }

  private async buildDetail(subscription: BillingSubscriptionResponse) {
    const [pkg, price] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackage
        .where({ id: subscription.packageId })
        .select('id', 'code', 'name')
        .first(),
      this.prisma.client.orm.public.SubscriptionPackagePrice
        .where({ id: subscription.packagePriceId })
        .select('id', 'billingPeriod', 'amountMinor', 'currency', 'version')
        .first(),
    ]);

    if (!pkg || !price) {
      throw new ConflictException('Data package subscription tidak lengkap');
    }

    return {
      ...subscription,
      package: pkg,
      packagePrice: price,
    };
  }
}
