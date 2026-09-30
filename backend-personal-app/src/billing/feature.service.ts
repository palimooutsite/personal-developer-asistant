import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface BillingFeatureAccess {
  code: string;
  name: string;
  valueType: string;
  enabled: boolean;
  limitValue: number | null;
  currentUsage?: number;
  allowed: boolean;
}

@Injectable()
export class BillingFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureMember(tenantId: string, userId: string) {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();

    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');
  }

  private async getActiveSubscription(tenantId: string) {
    const subscriptions = await this.prisma.client.orm.public.TenantSubscription
      .where({ tenantId })
      .all();

    const subscription = subscriptions
      .filter((item) => ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

    if (!subscription) {
      throw new ConflictException('Workspace belum memiliki subscription aktif');
    }

    return subscription;
  }

  private async getFeature(packageId: string, code: string) {
    const feature = await this.prisma.client.orm.public.SubscriptionFeature
      .where({ code })
      .first();

    if (!feature || !feature.isActive) {
      throw new NotFoundException('Subscription feature tidak ditemukan atau tidak aktif');
    }

    const packageFeature = await this.prisma.client.orm.public.SubscriptionPackageFeature
      .where({ packageId, featureId: feature.id })
      .first();

    return { feature, packageFeature };
  }

  async check(
    tenantId: string,
    userId: string,
    code: string,
    currentUsage = 0,
  ): Promise<BillingFeatureAccess> {
    await this.ensureMember(tenantId, userId);
    const subscription = await this.getActiveSubscription(tenantId);
    const { feature, packageFeature } = await this.getFeature(subscription.packageId, code);

    const enabled = packageFeature?.enabled === true;
    const limitValue = packageFeature?.limitValue ?? null;

    let allowed = enabled;
    if (enabled && feature.valueType === 'LIMIT' && limitValue !== null) {
      allowed = currentUsage < limitValue;
    }

    return {
      code: feature.code,
      name: feature.name,
      valueType: feature.valueType,
      enabled,
      limitValue,
      currentUsage,
      allowed,
    };
  }

  async assertEnabled(
    tenantId: string,
    userId: string,
    code: string,
  ): Promise<void> {
    const access = await this.check(tenantId, userId, code);

    if (!access.allowed) {
      throw new ConflictException(
        'Feature tidak tersedia pada subscription aktif workspace ini',
      );
    }
  }

  async assertWithinLimit(
    tenantId: string,
    userId: string,
    code: string,
    currentUsage: number,
  ): Promise<void> {
    const access = await this.check(tenantId, userId, code, currentUsage);

    if (!access.allowed) {
      if (access.valueType !== 'LIMIT') {
        throw new ConflictException(
          'Feature bukan merupakan feature berbasis limit',
        );
      }

      throw new ConflictException(
        'Limit feature subscription workspace sudah tercapai',
      );
    }
  }
}
