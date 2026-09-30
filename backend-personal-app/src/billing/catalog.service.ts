import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { CreateFeatureDto, BillingFeatureValueTypeDto } from './dto/create-feature.dto.js';
import { UpdateFeatureDto } from './dto/update-feature.dto.js';
import { CreatePriceDto, BillingPeriodDto } from './dto/create-price.dto.js';
import { UpdatePriceDto } from './dto/update-price.dto.js';
import { SetPackageFeatureDto } from './dto/set-package-feature.dto.js';

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
  constructor(private readonly prisma: PrismaService) {}

  async listPackages() {
    return this.prisma.client.orm.public.SubscriptionPackage
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

    return { ...pkg, prices, features };
  }

  async createPackage(data: CreatePackageDto): Promise<BillingPackageResponse> {
    const code = data.code.trim().toUpperCase();
    const existing = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ code })
      .first();

    if (existing) throw new ConflictException('Package dengan code tersebut sudah ada');

    return this.prisma.client.orm.public.SubscriptionPackage.create({
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
    });
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

    return this.prisma.client.orm.public.SubscriptionFeature.create({
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      valueType: data.valueType as BillingFeatureValueTypeDto,
      unit: data.unit?.trim() || null,
    });
  }

  async updateFeature(id: string, data: UpdateFeatureDto): Promise<BillingFeatureResponse> {
    const existing = await this.prisma.client.orm.public.SubscriptionFeature
      .where({ id })
      .first();

    if (!existing) throw new NotFoundException('Feature tidak ditemukan');

    const updated = await this.prisma.client.orm.public.SubscriptionFeature
      .where({ id })
      .update({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.unit !== undefined ? { unit: data.unit.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      });

    if (!updated) throw new NotFoundException('Feature gagal diperbarui');
    return updated;
  }

  async addPrice(packageId: string, data: CreatePriceDto): Promise<BillingPriceResponse> {
    const pkg = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id: packageId })
      .first();
    if (!pkg) throw new NotFoundException('Package tidak ditemukan');

    const existingPrices = await this.prisma.client.orm.public.SubscriptionPackagePrice
      .where({ packageId, billingPeriod: data.billingPeriod as BillingPeriodDto })
      .select('version')
      .all();

    const version = existingPrices.reduce(
      (max, price) => Math.max(max, price.version),
      0,
    ) + 1;

    return this.prisma.client.orm.public.SubscriptionPackagePrice.create({
      packageId,
      version,
      billingPeriod: data.billingPeriod as BillingPeriodDto,
      amountMinor: data.amountMinor,
      currency: data.currency?.trim().toUpperCase() || 'IDR',
    });
  }

  async updatePrice(id: string, data: UpdatePriceDto): Promise<BillingPriceResponse> {
    const existing = await this.prisma.client.orm.public.SubscriptionPackagePrice
      .where({ id })
      .first();
    if (!existing) throw new NotFoundException('Harga package tidak ditemukan');

    const updated = await this.prisma.client.orm.public.SubscriptionPackagePrice
      .where({ id })
      .update({
        ...(data.amountMinor !== undefined ? { amountMinor: data.amountMinor } : {}),
        ...(data.currency !== undefined ? { currency: data.currency.trim().toUpperCase() } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      });

    if (!updated) throw new NotFoundException('Harga gagal diperbarui');
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
