import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PERMISSION_MODULES } from '../tenants/roles/permission.constants.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';

export interface BillingCheckoutSessionResponse {
  id: string;
  packageId: string;
  packagePriceId: string;
  workspaceName: string;
  discountCode: string | null;
  originalAmountMinor: number;
  discountAmountMinor: number;
  taxAmountMinor: number;
  finalAmountMinor: number;
  currency: string;
  provider: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface BillingCheckoutSessionSuccessResponse {
  sessionId: string;
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  subscriptionId: string;
  status: 'SUCCEEDED';
}

@Injectable()
export class BillingCheckoutSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    data: CreateCheckoutSessionDto,
  ): Promise<BillingCheckoutSessionResponse> {
    const provider = data.provider ?? 'SANDBOX';

    if (provider !== 'SANDBOX') {
      throw new ConflictException(
        'Provider pembayaran selain SANDBOX belum tersedia pada tahap ini',
      );
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
      throw new ConflictException(
        'Harga package tidak sesuai dengan package yang dipilih',
      );
    }
    if (!price.isActive) {
      throw new ConflictException('Harga package sedang tidak aktif');
    }

    const originalAmountMinor = price.amountMinor;
    let discountAmountMinor = 0;
    let discount: any = null;

    if (data.discountCode?.trim()) {
      const code = data.discountCode.trim().toUpperCase();
      discount = await this.prisma.client.orm.public.Discount
        .where({ code })
        .first();

      if (!discount) throw new NotFoundException('Discount tidak ditemukan');
      if (!discount.isActive) throw new ConflictException('Discount tidak aktif');

      const now = Date.now();
      if (discount.startsAt && new Date(String(discount.startsAt)).getTime() > now) {
        throw new ConflictException('Discount belum mulai berlaku');
      }
      if (discount.expiresAt && new Date(String(discount.expiresAt)).getTime() <= now) {
        throw new ConflictException('Discount sudah kedaluwarsa');
      }
      if (
        discount.minimumAmountMinor !== null &&
        originalAmountMinor < discount.minimumAmountMinor
      ) {
        throw new ConflictException(
          'Nilai checkout belum memenuhi minimum amount discount',
        );
      }

      const packageLinks = await this.prisma.client.orm.public.DiscountPackage
        .where({ discountId: discount.id })
        .all();

      if (
        packageLinks.length > 0 &&
        !packageLinks.some((item) => item.packageId === pkg.id)
      ) {
        throw new ConflictException('Discount tidak berlaku untuk package ini');
      }

      if (
        discount.usageLimit !== null &&
        discount.usageCount >= discount.usageLimit
      ) {
        throw new ConflictException('Batas penggunaan discount sudah tercapai');
      }

      if (discount.type === 'PERCENTAGE') {
        discountAmountMinor = Math.floor(
          originalAmountMinor * Number(discount.percentage) / 100,
        );
        if (
          discount.maxDiscountMinor !== null &&
          discountAmountMinor > discount.maxDiscountMinor
        ) {
          discountAmountMinor = discount.maxDiscountMinor;
        }
      } else {
        discountAmountMinor = Number(discount.valueMinor ?? 0);
      }

      discountAmountMinor = Math.min(discountAmountMinor, originalAmountMinor);
    }

    const taxAmountMinor = 0;
    const finalAmountMinor = Math.max(
      originalAmountMinor - discountAmountMinor + taxAmountMinor,
      0,
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const session = await this.prisma.client.orm.public.BillingCheckoutSession.create({
      userId,
      packageId: pkg.id,
      packagePriceId: price.id,
      workspaceName: data.workspaceName.trim(),
      discountCode: data.discountCode?.trim().toUpperCase() || null,
      originalAmountMinor,
      discountAmountMinor,
      taxAmountMinor,
      finalAmountMinor,
      currency: price.currency,
      provider,
      providerSessionId: 'SANDBOX-SESSION-' + crypto.randomUUID(),
      status: 'PENDING',
      expiresAt: expiresAt.toISOString(),
    });

    if (!session) throw new ConflictException('Checkout session gagal dibuat');

    return this.toResponse(session);
  }

  async sandboxSucceed(
    userId: string,
    sessionId: string,
  ): Promise<BillingCheckoutSessionSuccessResponse> {
    const session = await this.prisma.client.orm.public.BillingCheckoutSession
      .where({ id: sessionId, userId })
      .first();

    if (!session) {
      throw new NotFoundException('Checkout session tidak ditemukan');
    }
    if (session.provider !== 'SANDBOX') {
      throw new ConflictException('Simulasi hanya tersedia untuk SANDBOX');
    }
    if (session.status !== 'PENDING') {
      throw new ConflictException('Checkout session tidak dalam status PENDING');
    }
    if (new Date(String(session.expiresAt)).getTime() <= Date.now()) {
      await this.prisma.client.orm.public.BillingCheckoutSession
        .where({ id: session.id })
        .update({ status: 'EXPIRED' });
      throw new ConflictException('Checkout session sudah kedaluwarsa');
    }

    const [pkg, price, user] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackage
        .where({ id: session.packageId })
        .first(),
      this.prisma.client.orm.public.SubscriptionPackagePrice
        .where({ id: session.packagePriceId })
        .first(),
      this.prisma.client.orm.public.User
        .where({ id: userId })
        .select('id')
        .first(),
    ]);

    if (!user) throw new NotFoundException('User tidak ditemukan');
    if (!pkg || !price) {
      throw new NotFoundException('Package checkout tidak ditemukan');
    }
    if (price.packageId !== pkg.id) {
      throw new ConflictException('Harga checkout tidak sesuai dengan package');
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

    const result = await this.prisma.client.transaction(async (tx) => {
      const tenant = await tx.orm.public.Tenant.create({
        name: session.workspaceName,
        createdBy: userId,
      });

      const ownerRole = await tx.orm.public.TenantCustomRole.create({
        tenantId: tenant.id,
        name: 'Owner',
        description: 'System role dengan akses penuh workspace.',
        isSystem: true,
      });

      for (const module of PERMISSION_MODULES) {
        await tx.orm.public.TenantRolePermission.create({
          roleId: ownerRole.id,
          module,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        });
      }

      await tx.orm.public.TenantMember.create({
        tenantId: tenant.id,
        userId,
        role: 'OWNER',
        roleId: ownerRole.id,
      });

      const subscription = await tx.orm.public.TenantSubscription.create({
        tenantId: tenant.id,
        packageId: pkg.id,
        packagePriceId: price.id,
        status: 'ACTIVE',
        provider: session.provider,
        startedAt: now.toISOString(),
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      });

      const invoice = await tx.orm.public.SubscriptionInvoice.create({
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        packagePriceId: price.id,
        packageCode: pkg.code,
        packageName: pkg.name,
        billingPeriod: price.billingPeriod,
        currency: session.currency,
        originalAmountMinor: session.originalAmountMinor,
        discountAmountMinor: session.discountAmountMinor,
        taxAmountMinor: session.taxAmountMinor,
        finalAmountMinor: session.finalAmountMinor,
        status: 'SUCCEEDED',
        issuedAt: now.toISOString(),
        paidAt: now.toISOString(),
        dueAt: now.toISOString(),
      });

      if (!invoice) throw new ConflictException('Invoice gagal dibuat');

      let discountId: string | null = null;
      if (session.discountCode) {
        const discount = await tx.orm.public.Discount
          .where({ code: session.discountCode })
          .first();

        if (!discount) {
          throw new ConflictException('Discount checkout tidak ditemukan');
        }

        if (
          discount.usageLimit !== null &&
          discount.usageCount >= discount.usageLimit
        ) {
          throw new ConflictException('Batas penggunaan discount sudah tercapai');
        }

        const packageLinks = await tx.orm.public.DiscountPackage
          .where({ discountId: discount.id })
          .all();

        if (
          packageLinks.length > 0 &&
          !packageLinks.some((item) => item.packageId === pkg.id)
        ) {
          throw new ConflictException('Discount tidak berlaku untuk package ini');
        }

        const previousUsages = await tx.orm.public.DiscountUsage
          .where({ discountId: discount.id, tenantId: tenant.id })
          .all();

        if (discount.duration === 'ONCE' && previousUsages.length > 0) {
          throw new ConflictException(
            'Discount hanya dapat digunakan satu kali untuk workspace ini',
          );
        }
        if (
          discount.duration === 'RECURRING_CYCLES' &&
          discount.durationCycles !== null &&
          previousUsages.length >= discount.durationCycles
        ) {
          throw new ConflictException(
            'Masa penggunaan discount untuk workspace ini sudah habis',
          );
        }

        await tx.orm.public.InvoiceDiscount.create({
          invoiceId: invoice.id,
          discountId: discount.id,
          codeSnapshot: discount.code,
          discountType: discount.type,
          discountValueMinor: discount.valueMinor,
          discountPercentage: discount.percentage,
          amountMinor: session.discountAmountMinor,
        });

        await tx.orm.public.DiscountUsage.create({
          discountId: discount.id,
          tenantId: tenant.id,
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
          usedAt: now.toISOString(),
        });

        await tx.orm.public.Discount
          .where({ id: discount.id })
          .update({ usageCount: Number(discount.usageCount) + 1 });

        discountId = discount.id;
      }

      const payment = await tx.orm.public.Payment.create({
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        provider: session.provider,
        providerPaymentId: session.providerPaymentId ?? ('SANDBOX-' + invoice.id),
        status: 'SUCCEEDED',
        amountMinor: session.finalAmountMinor,
        currency: session.currency,
        checkoutUrl: 'sandbox://payment/' + invoice.id,
        paidAt: now.toISOString(),
        expiresAt: session.expiresAt,
      });

      if (!payment) throw new ConflictException('Payment gagal dibuat');

      const updatedSession = await tx.orm.public.BillingCheckoutSession
        .where({ id: session.id, userId })
        .update({
          status: 'SUCCEEDED',
          providerPaymentId: payment.providerPaymentId,
          completedAt: now.toISOString(),
        });

      if (!updatedSession) {
        throw new ConflictException('Checkout session gagal diperbarui');
      }

      return {
        sessionId: session.id,
        tenantId: tenant.id,
        paymentId: payment.id,
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        status: 'SUCCEEDED' as const,
      };
    });

    return result;
  }

  async sandboxFail(
    userId: string,
    sessionId: string,
  ): Promise<{ sessionId: string; status: 'FAILED' }> {
    const session = await this.prisma.client.orm.public.BillingCheckoutSession
      .where({ id: sessionId, userId })
      .first();

    if (!session) throw new NotFoundException('Checkout session tidak ditemukan');
    if (session.provider !== 'SANDBOX') {
      throw new ConflictException('Simulasi hanya tersedia untuk SANDBOX');
    }
    if (session.status !== 'PENDING') {
      throw new ConflictException('Checkout session tidak dalam status PENDING');
    }

    const updated = await this.prisma.client.orm.public.BillingCheckoutSession
      .where({ id: sessionId, userId })
      .update({ status: 'FAILED' });

    if (!updated) throw new ConflictException('Checkout session gagal diperbarui');

    return { sessionId, status: 'FAILED' };
  }

  private toResponse(session: any): BillingCheckoutSessionResponse {
    return {
      id: session.id,
      packageId: session.packageId,
      packagePriceId: session.packagePriceId,
      workspaceName: session.workspaceName,
      discountCode: session.discountCode ?? null,
      originalAmountMinor: session.originalAmountMinor,
      discountAmountMinor: session.discountAmountMinor,
      taxAmountMinor: session.taxAmountMinor,
      finalAmountMinor: session.finalAmountMinor,
      currency: session.currency,
      provider: session.provider,
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }
}
