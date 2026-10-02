import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { CreateFeatureDto, BillingFeatureValueTypeDto } from './dto/create-feature.dto.js';
import { UpdateFeatureDto } from './dto/update-feature.dto.js';
import { CreatePriceDto, BillingPeriodDto } from './dto/create-price.dto.js';
import { UpdatePriceDto } from './dto/update-price.dto.js';
import { SetPackageFeatureDto } from './dto/set-package-feature.dto.js';
import { AuditService } from '../audit/audit.service.js';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'sqlState' in error && String((error as { sqlState?: unknown }).sqlState) === '23505';
}

export interface BillingPackageResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface BillingFeatureResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  valueType: string;
  unit: string | null;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface BillingPriceResponse {
  id: string;
  packageId: string;
  version: number;
  billingPeriod: string;
  amountMinor: number;
  currency: string;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface BillingPackageFeatureResponse {
  id: string;
  packageId: string;
  featureId: string;
  enabled: boolean;
  limitValue: number | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface BillingMessageResponse {
  message: string;
}

@Injectable()
export class BillingCatalogService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async listPackages() {
    const packages = await this.prisma.client.orm.public.SubscriptionPackage
      .select(
        'id',
        'code',
        'name',
        'description',
        'isActive',
        'sortOrder',
        'createdAt',
        'updatedAt',
      )
      .all();

    const [prices, packageFeatures, features] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackagePrice
        .where({})
        .select(
          'id',
          'packageId',
          'version',
          'billingPeriod',
          'amountMinor',
          'currency',
          'isActive',
          'createdAt',
          'updatedAt',
        )
        .all(),
      this.prisma.client.orm.public.SubscriptionPackageFeature
        .where({})
        .select(
          'id',
          'packageId',
          'featureId',
          'enabled',
          'limitValue',
          'createdAt',
          'updatedAt',
        )
        .all(),
      this.prisma.client.orm.public.SubscriptionFeature
        .where({})
        .select(
          'id',
          'code',
          'name',
          'description',
          'valueType',
          'unit',
          'isActive',
        )
        .all(),
    ]);

    return packages.map((pkg) => ({
      ...pkg,
      prices: prices.filter((price) => price.packageId === pkg.id),
      features: packageFeatures
        .filter((item) => item.packageId === pkg.id)
        .map((item) => ({
          ...item,
          feature:
            features.find((feature) => feature.id === item.featureId) ?? null,
        })),
    }));
  }

  async getPackage(id: string) {
    const pkg = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id })
      .select(
        'id',
        'code',
        'name',
        'description',
        'isActive',
        'sortOrder',
        'createdAt',
        'updatedAt',
      )
      .first();

    if (!pkg) throw new NotFoundException('Package tidak ditemukan');

    const prices = await this.prisma.client.orm.public.SubscriptionPackagePrice
      .where({ packageId: id })
      .select(
        'id',
        'version',
        'billingPeriod',
        'amountMinor',
        'currency',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .all();

    const features = await this.prisma.client.orm.public.SubscriptionPackageFeature
      .where({ packageId: id })
      .select('id', 'featureId', 'enabled', 'limitValue', 'createdAt', 'updatedAt')
      .all();

    const featureRows = await this.prisma.client.orm.public.SubscriptionFeature
      .where({})
      .select('id', 'code', 'name', 'description', 'valueType', 'unit', 'isActive')
      .all();

    return {
      ...pkg,
      prices,
      features: features.map((item) => ({
        ...item,
        feature: featureRows.find((feature) => feature.id === item.featureId) ?? null,
      })),
    };
  }

  async getPackageFeatures(id: string) {
    const pkg = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id })
      .select('id', 'code', 'name', 'description', 'isActive', 'sortOrder')
      .first();

    if (!pkg) throw new NotFoundException('Package tidak ditemukan');

    const [prices, packageFeatures, featureRows] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackagePrice
        .where({ packageId: id })
        .select(
          'id',
          'packageId',
          'version',
          'billingPeriod',
          'amountMinor',
          'currency',
          'isActive',
          'createdAt',
          'updatedAt',
        )
        .all(),
      this.prisma.client.orm.public.SubscriptionPackageFeature
        .where({ packageId: id })
        .select('id', 'packageId', 'featureId', 'enabled', 'limitValue', 'createdAt', 'updatedAt')
        .all(),
      this.prisma.client.orm.public.SubscriptionFeature
        .where({})
        .select('id', 'code', 'name', 'description', 'valueType', 'unit', 'isActive')
        .all(),
    ]);

    return {
      package: {
        ...pkg,
        prices,
      },
      features: packageFeatures.map((item) => ({
        ...item,
        feature: featureRows.find((feature) => feature.id === item.featureId) ?? null,
      })),
    };
  }

  async seedDefaults(): Promise<{ packages: number; features: number; prices: number; packageFeatures: number }> {
    const features = [
      { code: 'PROJECT', name: 'Projects', description: 'Jumlah project yang dapat dibuat workspace', valueType: 'LIMIT' as const, unit: 'projects' },
      { code: 'TASK', name: 'Tasks', description: 'Jumlah task yang dapat dibuat workspace', valueType: 'LIMIT' as const, unit: 'tasks' },
      { code: 'KNOWLEDGE', name: 'Knowledge', description: 'Jumlah artikel knowledge yang dapat dibuat workspace', valueType: 'LIMIT' as const, unit: 'articles' },
      { code: 'CODE_SNIPPET', name: 'Code Snippets', description: 'Jumlah code snippet yang dapat dibuat workspace', valueType: 'LIMIT' as const, unit: 'snippets' },
      { code: 'DOCUMENT', name: 'Documents', description: 'Jumlah document yang dapat disimpan workspace', valueType: 'LIMIT' as const, unit: 'documents' },
      { code: 'WORKSPACE_MEMBER', name: 'Workspace Members', description: 'Jumlah member yang dapat bergabung ke workspace termasuk Owner', valueType: 'LIMIT' as const, unit: 'members' },
    ];

    const packages = [
      { code: 'FREE', name: 'Free', description: 'Paket gratis untuk penggunaan dasar', sortOrder: 10 },
      { code: 'PRO', name: 'Pro', description: 'Paket untuk developer dan workspace yang berkembang', sortOrder: 20 },
      { code: 'BUSINESS', name: 'Business', description: 'Paket untuk workspace dengan kebutuhan lebih besar', sortOrder: 30 },
    ];

    let packageCount = 0;
    let featureCount = 0;
    let priceCount = 0;
    let packageFeatureCount = 0;

    for (const featureData of features) {
      const existing = await this.prisma.client.orm.public.SubscriptionFeature
        .where({ code: featureData.code })
        .first();

      if (!existing) {
        await this.prisma.client.orm.public.SubscriptionFeature.create(featureData);
        featureCount++;
      }
    }

    const featureCodes = ['PROJECT', 'TASK', 'KNOWLEDGE', 'CODE_SNIPPET', 'DOCUMENT', 'WORKSPACE_MEMBER'];
    const featureRows = await this.prisma.client.orm.public.SubscriptionFeature.where({}).all();

    

    const limits: Record<string, Record<string, number>> = {
      FREE: { PROJECT: 3, TASK: 10, KNOWLEDGE: 50, CODE_SNIPPET: 50, DOCUMENT: 20, WORKSPACE_MEMBER: 2 },
      PRO: { PROJECT: 20, TASK: 100, KNOWLEDGE: 1000, CODE_SNIPPET: 1000, DOCUMENT: 500, WORKSPACE_MEMBER: 10 },
      BUSINESS: { PROJECT: 100, TASK: 500, KNOWLEDGE: 10000, CODE_SNIPPET: 10000, DOCUMENT: 5000, WORKSPACE_MEMBER: 50 },
    };

    for (const packageData of packages) {
      let pkg = await this.prisma.client.orm.public.SubscriptionPackage
        .where({ code: packageData.code })
        .first();

      if (!pkg) {
        pkg = await this.prisma.client.orm.public.SubscriptionPackage.create(packageData);
        packageCount++;
      }

      for (const featureCode of featureCodes) {
        const feature = featureRows.find((item) => item.code === featureCode);
        if (!feature) continue;

        const packageFeature = await this.prisma.client.orm.public.SubscriptionPackageFeature
          .where({ packageId: pkg.id, featureId: feature.id })
          .first();

        if (!packageFeature) {
          await this.prisma.client.orm.public.SubscriptionPackageFeature.create({
            packageId: pkg.id,
            featureId: feature.id,
            enabled: true,
            limitValue: limits[pkg.code]?.[featureCode] ?? 0,
          });
          packageFeatureCount++;
        }
      }

      const prices = [
        { billingPeriod: 'MONTHLY' as const, amountMinor: pkg.code === 'FREE' ? 0 : pkg.code === 'PRO' ? 99000 * 100 : 249000 * 100 },
        { billingPeriod: 'YEARLY' as const, amountMinor: pkg.code === 'FREE' ? 0 : pkg.code === 'PRO' ? 990000 * 100 : 2490000 * 100 },
      ];

      for (const priceData of prices) {
        const existingPrice = await this.prisma.client.orm.public.SubscriptionPackagePrice
          .where({ packageId: pkg.id, billingPeriod: priceData.billingPeriod, version: 1 })
          .first();

        if (!existingPrice) {
          await this.prisma.client.orm.public.SubscriptionPackagePrice.create({
            packageId: pkg.id,
            version: 1,
            billingPeriod: priceData.billingPeriod,
            amountMinor: priceData.amountMinor,
            currency: 'IDR',
            isActive: true,
          });
          priceCount++;
        }
      }
    }

    return { packages: packageCount, features: featureCount, prices: priceCount, packageFeatures: packageFeatureCount };
  }

  async createPackage(data: CreatePackageDto): Promise<BillingPackageResponse> {
    const code = data.code.trim().toUpperCase();
    const existing = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ code })
      .first();

    if (existing) throw new ConflictException('Package dengan code tersebut sudah ada');

    let created: BillingPackageResponse;
    try {
      created = await this.prisma.client.orm.public.SubscriptionPackage.create({
        code,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Package dengan code tersebut sudah ada');
      }
      throw error;
    }
    await this.auditService.create({ action: 'BILLING.PACKAGE_CREATED', entity: 'SubscriptionPackage', entityId: created.id, description: `Package ${created.code} dibuat`, metadata: { code: created.code, name: created.name } });
    return created;
  }

  async updatePackage(id: string, data: UpdatePackageDto): Promise<BillingPackageResponse> {
    const existing = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id })
      .first();

    if (!existing) throw new NotFoundException('Package tidak ditemukan');

    const updated = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id })
      .update({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      });

    if (!updated) throw new NotFoundException('Package gagal diperbarui');
    await this.auditService.create({ action: 'BILLING.PACKAGE_UPDATED', entity: 'SubscriptionPackage', entityId: id, description: `Package ${updated.code} diperbarui`, metadata: data });
    return updated;
  }

  async listFeatures() {
    return this.prisma.client.orm.public.SubscriptionFeature
      .select(
        'id',
        'code',
        'name',
        'description',
        'valueType',
        'unit',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .all();
  }

  async createFeature(data: CreateFeatureDto): Promise<BillingFeatureResponse> {
    const code = data.code.trim().toUpperCase();
    const existing = await this.prisma.client.orm.public.SubscriptionFeature
      .where({ code })
      .first();

    if (existing) throw new ConflictException('Feature dengan code tersebut sudah ada');

    let created: BillingFeatureResponse;
    try {
      created = await this.prisma.client.orm.public.SubscriptionFeature.create({
        code,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        valueType: data.valueType as BillingFeatureValueTypeDto,
        unit: data.unit?.trim() || null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Feature dengan code tersebut sudah ada');
      }
      throw error;
    }
    await this.auditService.create({ action: 'BILLING.FEATURE_CREATED', entity: 'SubscriptionFeature', entityId: created.id, description: `Feature ${created.code} dibuat`, metadata: { code: created.code } });
    return created;
  }

  async updateFeature(id: string, data: UpdateFeatureDto): Promise<BillingFeatureResponse> {
    const existing = await this.prisma.client.orm.public.SubscriptionFeature
      .where({ id })
      .first();

    if (!existing) throw new NotFoundException('Feature tidak ditemukan');

    if (
      data.valueType !== undefined &&
      data.valueType !== existing.valueType
    ) {
      const packageFeatures = await this.prisma.client.orm.public.SubscriptionPackageFeature
        .where({ featureId: id })
        .all();

      if (
        data.valueType === BillingFeatureValueTypeDto.BOOLEAN &&
        packageFeatures.some((item) => item.limitValue !== null)
      ) {
        throw new ConflictException(
          'Feature tidak dapat diubah menjadi BOOLEAN karena masih memiliki limitValue pada package',
        );
      }

      if (data.valueType === BillingFeatureValueTypeDto.LIMIT) {
        for (const packageFeature of packageFeatures) {
          if (packageFeature.enabled && packageFeature.limitValue === null) {
            throw new ConflictException(
              'Feature tidak dapat diubah menjadi LIMIT karena ada package aktif tanpa limitValue',
            );
          }
        }
      }
    }

    const updated = await this.prisma.client.orm.public.SubscriptionFeature
      .where({ id })
      .update({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.valueType !== undefined ? { valueType: data.valueType as BillingFeatureValueTypeDto } : {}),
        ...(data.unit !== undefined ? { unit: data.unit.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      });

    if (!updated) throw new NotFoundException('Feature gagal diperbarui');
    await this.auditService.create({ action: 'BILLING.FEATURE_UPDATED', entity: 'SubscriptionFeature', entityId: id, description: `Feature ${updated.code} diperbarui`, metadata: data });
    return updated;
  }

  async listPrices(packageId: string): Promise<BillingPriceResponse[]> {
    const pkg = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id: packageId })
      .first();

    if (!pkg) throw new NotFoundException('Package tidak ditemukan');

    return this.prisma.client.orm.public.SubscriptionPackagePrice
      .where({ packageId })
      .select(
        'id',
        'packageId',
        'version',
        'billingPeriod',
        'amountMinor',
        'currency',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .all();
  }

  async addPrice(packageId: string, data: CreatePriceDto): Promise<BillingPriceResponse> {
    const created = await this.prisma.client.transaction(async (tx) => {
      const pkg = await tx.orm.public.SubscriptionPackage
        .where({ id: packageId })
        .first();
      if (!pkg) throw new NotFoundException('Package tidak ditemukan');

      // Serialize version allocation per package. The unique constraint
      // remains the final database guard for package/period/version.
      const lockPlan = this.prisma.client.raw.sql`
        UPDATE "public"."subscriptionPackage"
        SET "updatedAt" = "updatedAt"
        WHERE "id" = ${packageId}
      `.affectedCount().build();

      await tx.execute(lockPlan);

      const existingPrices = await tx.orm.public.SubscriptionPackagePrice
        .where({ packageId, billingPeriod: data.billingPeriod as BillingPeriodDto })
        .select('version')
        .all();

      const version = existingPrices.reduce(
        (max, price) => Math.max(max, price.version),
        0,
      ) + 1;

      try {
        return await tx.orm.public.SubscriptionPackagePrice.create({
          packageId,
          version,
          billingPeriod: data.billingPeriod as BillingPeriodDto,
          amountMinor: data.amountMinor,
          currency: data.currency?.trim().toUpperCase() || 'IDR',
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException('Versi harga package sudah digunakan. Silakan coba lagi.');
        }
        throw error;
      }
    });

    await this.auditService.create({
      action: 'BILLING.PRICE_CREATED',
      entity: 'SubscriptionPackagePrice',
      entityId: created.id,
      description: `Harga package ${packageId} dibuat`,
      metadata: {
        packageId,
        billingPeriod: created.billingPeriod,
        version: created.version,
        amountMinor: created.amountMinor,
      },
    });
    return created;
  }

  async updatePrice(id: string, data: UpdatePriceDto): Promise<BillingPriceResponse> {
    const financialFieldsChanged =
      data.amountMinor !== undefined || data.currency !== undefined;

    const updated = await this.prisma.client.transaction(async (tx) => {
      // Serialize price mutation with subscription/invoice creation paths.
      const lockPlan = this.prisma.client.raw.sql`
        UPDATE "public"."subscriptionPackagePrice"
        SET "updatedAt" = "updatedAt"
        WHERE "id" = ${id}
      `.affectedCount().build();

      await tx.execute(lockPlan);

      const existing = await tx.orm.public.SubscriptionPackagePrice
        .where({ id })
        .first();

      if (!existing) {
        throw new NotFoundException('Harga package tidak ditemukan');
      }

      if (financialFieldsChanged) {
        const [subscription, invoice] = await Promise.all([
          tx.orm.public.TenantSubscription
            .where({ packagePriceId: id })
            .select('id')
            .first(),
          tx.orm.public.SubscriptionInvoice
            .where({ packagePriceId: id })
            .select('id')
            .first(),
        ]);

        if (subscription || invoice) {
          throw new ConflictException(
            'Harga package tidak dapat mengubah amount/currency setelah pernah digunakan. Buat versi harga baru untuk perubahan finansial.',
          );
        }
      }

      const result = await tx.orm.public.SubscriptionPackagePrice
        .where({ id })
        .update({
          ...(data.amountMinor !== undefined ? { amountMinor: data.amountMinor } : {}),
          ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        });

      if (!result) throw new NotFoundException('Harga gagal diperbarui');
      return result;
    });

    await this.auditService.create({
      action: 'BILLING.PRICE_UPDATED',
      entity: 'SubscriptionPackagePrice',
      entityId: id,
      description: 'Harga package diperbarui',
      metadata: data,
    });
    return updated;
  }

  async setPackageFeature(
    packageId: string,
    featureId: string,
    data: SetPackageFeatureDto,
  ): Promise<BillingPackageFeatureResponse> {
    const [pkg, feature] = await Promise.all([
      this.prisma.client.orm.public.SubscriptionPackage.where({ id: packageId }).first(),
      this.prisma.client.orm.public.SubscriptionFeature.where({ id: featureId }).first(),
    ]);

    if (!pkg) throw new NotFoundException('Package tidak ditemukan');
    if (!feature) throw new NotFoundException('Feature tidak ditemukan');

    if (feature.valueType === 'BOOLEAN' && data.limitValue !== undefined) {
      throw new ConflictException('Feature BOOLEAN tidak boleh memiliki limitValue');
    }

    if (feature.valueType === 'LIMIT' && data.enabled && data.limitValue === undefined) {
      throw new ConflictException('Feature LIMIT yang aktif wajib memiliki limitValue');
    }

    const existing = await this.prisma.client.orm.public.SubscriptionPackageFeature
      .where({ packageId, featureId })
      .first();

    if (existing) {
      const updated = await this.prisma.client.orm.public.SubscriptionPackageFeature
        .where({ packageId, featureId })
        .update({
          enabled: data.enabled,
          limitValue: data.limitValue ?? null,
        });

      if (!updated) {
        throw new NotFoundException('Konfigurasi feature package gagal diperbarui');
      }

      return updated;
    }

    try {
      const created = await this.prisma.client.orm.public.SubscriptionPackageFeature.create({
        packageId,
        featureId,
        enabled: data.enabled,
        limitValue: data.limitValue ?? null,
      });

      if (!created) {
        throw new ConflictException('Konfigurasi feature package gagal dibuat');
      }

      return created;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Feature sudah terpasang pada package');
      }
      throw error;
    }
  }

  async removePackageFeature(packageId: string, featureId: string): Promise<BillingMessageResponse> {
    const existing = await this.prisma.client.orm.public.SubscriptionPackageFeature
      .where({ packageId, featureId })
      .first();

    if (!existing) throw new NotFoundException('Feature belum terpasang pada package');

    await this.prisma.client.orm.public.SubscriptionPackageFeature
      .where({ packageId, featureId })
      .delete();

    return { message: 'Feature berhasil dilepas dari package' };
  }
}
