import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { db } from '../prisma/db.js';

type BillingTransactionClient = { orm: typeof db.orm };

export interface BillingFeatureAccess {
  code: string;
  name: string;
  valueType: string;
  enabled: boolean;
  limitValue: number | null;
  currentUsage?: number;
  allowed: boolean;
  remaining?: number | null;
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

    if (feature.valueType === 'BOOLEAN' && limitValue !== null) {
      throw new ConflictException(
        'Konfigurasi subscription feature tidak konsisten: BOOLEAN tidak boleh memiliki limitValue',
      );
    }

    if (
      feature.valueType === 'LIMIT' &&
      enabled &&
      limitValue === null
    ) {
      throw new ConflictException(
        'Konfigurasi subscription feature tidak konsisten: LIMIT aktif wajib memiliki limitValue',
      );
    }

    let allowed = enabled;
    if (enabled && feature.valueType === 'LIMIT' && limitValue !== null) {
      allowed = currentUsage < limitValue;
    }

    const remaining =
      feature.valueType === 'LIMIT' && limitValue !== null
        ? Math.max(0, limitValue - currentUsage)
        : null;

    return {
      code: feature.code,
      name: feature.name,
      valueType: feature.valueType,
      enabled,
      limitValue,
      currentUsage,
      remaining,
      allowed,
    };
  }

  async listSubscriptionFeatures(tenantId: string, userId: string) {
    await this.ensureMember(tenantId, userId);
    const subscription = await this.getActiveSubscription(tenantId);

    const packageRows = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id: subscription.packageId })
      .select('id', 'code', 'name')
      .first();

    if (!packageRows) throw new NotFoundException('Package subscription tidak ditemukan');

    const [packageFeatures, featureRows] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackageFeature
        .where({ packageId: subscription.packageId })
        .select('id', 'featureId', 'enabled', 'limitValue')
        .all(),
      this.prisma.client.orm.public.SubscriptionFeature
        .where({})
        .select('id', 'code', 'name', 'valueType', 'unit', 'isActive')
        .all(),
    ]);

    const usageByFeature: Record<string, number> = {};
    const usageQueries: Array<Promise<void>> = [];

    for (const feature of featureRows) {
      if (!feature.isActive || !packageFeatures.some((item) => item.featureId === feature.id)) continue;

      if (feature.code === 'PROJECT') {
        usageQueries.push((async () => {
          const rows = await this.prisma.client.orm.public.Project
            .where({ tenantId })
            .select('id')
            .all();
          usageByFeature[feature.code] = rows.length;
        })());
      } else if (feature.code === 'TASK') {
        usageQueries.push((async () => {
          const rows = await this.prisma.client.orm.public.Task
            .where({ tenantId })
            .select('id')
            .all();
          usageByFeature[feature.code] = rows.length;
        })());
      } else if (feature.code === 'KNOWLEDGE') {
        usageQueries.push((async () => {
          const rows = await this.prisma.client.orm.public.KnowledgeArticle
            .where({ tenantId })
            .select('id')
            .all();
          usageByFeature[feature.code] = rows.length;
        })());
      } else if (feature.code === 'CODE_SNIPPET') {
        usageQueries.push((async () => {
          const rows = await this.prisma.client.orm.public.CodeSnippet
            .where({ tenantId })
            .select('id')
            .all();
          usageByFeature[feature.code] = rows.length;
        })());
      } else if (feature.code === 'DOCUMENT') {
        usageQueries.push((async () => {
          const rows = await this.prisma.client.orm.public.Document
            .where({ tenantId })
            .select('id')
            .all();
          usageByFeature[feature.code] = rows.length;
        })());
      }
    }

    await Promise.all(usageQueries);

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        packageId: subscription.packageId,
      },
      package: packageRows,
      features: packageFeatures.map((packageFeature) => {
        const feature = featureRows.find((item) => item.id === packageFeature.featureId);
        const currentUsage = feature ? (usageByFeature[feature.code] ?? 0) : 0;
        const remaining = packageFeature.limitValue === null
          ? null
          : Math.max(0, packageFeature.limitValue - currentUsage);

        return {
          id: packageFeature.id,
          featureId: packageFeature.featureId,
          code: feature?.code ?? null,
          name: feature?.name ?? null,
          valueType: feature?.valueType ?? null,
          unit: feature?.unit ?? null,
          enabled: packageFeature.enabled,
          limitValue: packageFeature.limitValue,
          currentUsage,
          remaining,
          allowed: packageFeature.enabled && (packageFeature.limitValue === null || currentUsage < packageFeature.limitValue),
        };
      }),
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

  async assertWithinLimitWithClient(
    client: BillingTransactionClient,
    tenantId: string,
    userId: string,
    code: string,
    currentUsage: number,
  ): Promise<void> {
    const member = await client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();
    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');

    const subscriptions = await client.orm.public.TenantSubscription
      .where({ tenantId })
      .all();
    const subscription = subscriptions
      .filter((item) => ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (!subscription) throw new ConflictException('Workspace belum memiliki subscription aktif');

    const feature = await client.orm.public.SubscriptionFeature
      .where({ code })
      .first();
    if (!feature || !feature.isActive) {
      throw new NotFoundException('Subscription feature tidak ditemukan atau tidak aktif');
    }

    const packageFeature = await client.orm.public.SubscriptionPackageFeature
      .where({ packageId: subscription.packageId, featureId: feature.id })
      .first();
    const enabled = packageFeature?.enabled === true;
    const limitValue = packageFeature?.limitValue ?? null;

    if (feature.valueType === 'BOOLEAN' && limitValue !== null) {
      throw new ConflictException('Konfigurasi subscription feature tidak konsisten: BOOLEAN tidak boleh memiliki limitValue');
    }
    if (feature.valueType === 'LIMIT' && enabled && limitValue === null) {
      throw new ConflictException('Konfigurasi subscription feature tidak konsisten: LIMIT aktif wajib memiliki limitValue');
    }

    if (!enabled) {
      throw new ConflictException('Feature tidak tersedia pada subscription aktif workspace ini');
    }
    if (feature.valueType !== 'LIMIT') {
      throw new ConflictException('Feature bukan merupakan feature berbasis limit');
    }
    if (limitValue !== null && currentUsage >= limitValue) {
      throw new ConflictException({
        code: 'FEATURE_LIMIT_REACHED',
        message: 'Limit feature subscription workspace sudah tercapai',
        feature: feature.code,
        currentUsage,
        limit: limitValue,
        remaining: Math.max(0, limitValue - currentUsage),
      });
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

      const error = new ConflictException({
        code: 'FEATURE_LIMIT_REACHED',
        message: 'Limit feature subscription workspace sudah tercapai',
        feature: access.code,
        currentUsage: access.currentUsage ?? 0,
        limit: access.limitValue,
        remaining: access.remaining ?? 0,
      });
      throw error;
    }
  }
}
