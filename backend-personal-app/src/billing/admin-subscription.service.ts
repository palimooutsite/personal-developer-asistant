import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AdminSubscriptionListItem {
  id: string;
  tenantId: string;
  workspaceName: string;
  packageId: string;
  packageName: string;
  packageCode: string;
  billingPeriod: string;
  amountMinor: number;
  currency: string;
  status: string;
  provider: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  startedAt: string;
  cancelledAt: string | null;
  createdAt: string;
}

@Injectable()
export class BillingAdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminSubscriptionListItem[]> {
    const rows = await this.prisma.client.orm.public.TenantSubscription
      .select(
        'id',
        'tenantId',
        'packageId',
        'packagePriceId',
        'status',
        'provider',
        'startedAt',
        'currentPeriodStart',
        'currentPeriodEnd',
        'cancelledAt',
        'createdAt',
      )
      .all();

    const result: AdminSubscriptionListItem[] = [];

    for (const row of rows) {
      const [tenant, pkg, price] = await Promise.all([
        this.prisma.client.orm.public.Tenant
          .where({ id: row.tenantId })
          .select('id', 'name')
          .first(),
        this.prisma.client.orm.public.SubscriptionPackage
          .where({ id: row.packageId })
          .select('id', 'code', 'name')
          .first(),
        this.prisma.client.orm.public.SubscriptionPackagePrice
          .where({ id: row.packagePriceId })
          .select('id', 'billingPeriod', 'amountMinor', 'currency')
          .first(),
      ]);

      if (!tenant || !pkg || !price) continue;

      result.push({
        id: row.id,
        tenantId: row.tenantId,
        workspaceName: tenant.name,
        packageId: pkg.id,
        packageName: pkg.name,
        packageCode: pkg.code,
        billingPeriod: String(price.billingPeriod),
        amountMinor: Number(price.amountMinor),
        currency: String(price.currency),
        status: String(row.status),
        provider: String(row.provider),
        currentPeriodStart: String(row.currentPeriodStart),
        currentPeriodEnd: String(row.currentPeriodEnd),
        startedAt: String(row.startedAt),
        cancelledAt: row.cancelledAt ? String(row.cancelledAt) : null,
        createdAt: String(row.createdAt),
      });
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findOne(id: string): Promise<AdminSubscriptionListItem> {
    const item = (await this.findAll()).find((subscription) => subscription.id === id);

    if (!item) {
      throw new NotFoundException('Subscription tidak ditemukan');
    }

    return item;
  }
}