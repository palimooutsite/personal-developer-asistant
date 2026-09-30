import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BillingDiscountDurationDto,
  BillingDiscountTypeDto,
  CreateDiscountDto,
} from './dto/create-discount.dto.js';
import { SetDiscountPackageDto } from './dto/set-discount-package.dto.js';
import { UpdateDiscountDto } from './dto/update-discount.dto.js';

export interface BillingDiscountResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  valueMinor: number | null;
  percentage: number | null;
  maxDiscountMinor: number | null;
  minimumAmountMinor: number | null;
  duration: string;
  durationCycles: number | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: unknown;
  expiresAt: unknown;
  isActive: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface BillingDiscountPackageResponse {
  id: string;
  discountId: string;
  packageId: string;
  createdAt: unknown;
}

export interface BillingDiscountMessageResponse {
  message: string;
}

@Injectable()
export class BillingDiscountService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDefinition(data: {
    type: BillingDiscountTypeDto;
    valueMinor?: number | null;
    percentage?: number | null;
    maxDiscountMinor?: number | null;
    duration: BillingDiscountDurationDto;
    durationCycles?: number | null;
    startsAt?: string | null;
    expiresAt?: string | null;
  }) {
    if (data.type === BillingDiscountTypeDto.PERCENTAGE) {
      if (data.percentage === undefined || data.percentage === null) {
        throw new ConflictException('Discount PERCENTAGE wajib memiliki percentage');
      }
      if (data.percentage < 1 || data.percentage > 100) {
        throw new ConflictException('Percentage discount harus berada di antara 1 dan 100');
      }
      if (data.valueMinor !== undefined && data.valueMinor !== null) {
        throw new ConflictException('Discount PERCENTAGE tidak boleh memiliki valueMinor');
      }
    }

    if (data.type === BillingDiscountTypeDto.FIXED_AMOUNT) {
      if (data.valueMinor === undefined || data.valueMinor === null || data.valueMinor <= 0) {
        throw new ConflictException('Discount FIXED_AMOUNT wajib memiliki valueMinor lebih dari 0');
      }
      if (data.percentage !== undefined && data.percentage !== null) {
        throw new ConflictException('Discount FIXED_AMOUNT tidak boleh memiliki percentage');
      }
    }

    if (data.duration === BillingDiscountDurationDto.RECURRING_CYCLES) {
      if (data.durationCycles === undefined || data.durationCycles === null) {
        throw new ConflictException('Discount RECURRING_CYCLES wajib memiliki durationCycles');
      }
    } else if (data.durationCycles !== undefined && data.durationCycles !== null) {
      throw new ConflictException('durationCycles hanya boleh digunakan untuk RECURRING_CYCLES');
    }

    if (data.startsAt && data.expiresAt) {
      const startsAt = new Date(data.startsAt).getTime();
      const expiresAt = new Date(data.expiresAt).getTime();
      if (startsAt >= expiresAt) {
        throw new ConflictException('startsAt harus lebih awal dari expiresAt');
      }
    }

    if (
      data.type === BillingDiscountTypeDto.PERCENTAGE &&
      data.maxDiscountMinor !== undefined &&
      data.maxDiscountMinor !== null &&
      data.maxDiscountMinor <= 0
    ) {
      throw new ConflictException('maxDiscountMinor harus lebih dari 0');
    }
  }

  async list(): Promise<BillingDiscountResponse[]> {
    return this.prisma.client.orm.public.Discount
      .select(
        'id',
        'code',
        'name',
        'description',
        'type',
        'valueMinor',
        'percentage',
        'maxDiscountMinor',
        'minimumAmountMinor',
        'duration',
        'durationCycles',
        'usageLimit',
        'usageCount',
        'startsAt',
        'expiresAt',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .all();
  }

  async findOne(id: string): Promise<BillingDiscountResponse> {
    const discount = await this.prisma.client.orm.public.Discount
      .where({ id })
      .select(
        'id',
        'code',
        'name',
        'description',
        'type',
        'valueMinor',
        'percentage',
        'maxDiscountMinor',
        'minimumAmountMinor',
        'duration',
        'durationCycles',
        'usageLimit',
        'usageCount',
        'startsAt',
        'expiresAt',
        'isActive',
        'createdAt',
        'updatedAt',
      )
      .first();

    if (!discount) throw new NotFoundException('Discount tidak ditemukan');
    return discount;
  }

  async create(data: CreateDiscountDto): Promise<BillingDiscountResponse> {
    const code = data.code.trim().toUpperCase();
    const existing = await this.prisma.client.orm.public.Discount.where({ code }).first();

    if (existing) throw new ConflictException('Discount dengan code tersebut sudah ada');

    const duration = data.duration ?? BillingDiscountDurationDto.ONCE;
    this.validateDefinition({
      type: data.type,
      valueMinor: data.valueMinor,
      percentage: data.percentage,
      maxDiscountMinor: data.maxDiscountMinor,
      duration,
      durationCycles: data.durationCycles,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
    });

    if (data.usageLimit !== undefined && data.usageLimit < 1) {
      throw new ConflictException('usageLimit harus lebih dari 0');
    }

    return this.prisma.client.orm.public.Discount.create({
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      valueMinor: data.type === BillingDiscountTypeDto.FIXED_AMOUNT ? data.valueMinor : null,
      percentage: data.type === BillingDiscountTypeDto.PERCENTAGE ? data.percentage : null,
      maxDiscountMinor: data.maxDiscountMinor ?? null,
      minimumAmountMinor: data.minimumAmountMinor ?? null,
      duration,
      durationCycles: duration === BillingDiscountDurationDto.RECURRING_CYCLES
        ? data.durationCycles
        : null,
      usageLimit: data.usageLimit ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    });
  }

  async update(id: string, data: UpdateDiscountDto): Promise<BillingDiscountResponse> {
    const existing = await this.findOne(id);

    const type = data.type ?? (existing.type as BillingDiscountTypeDto);
    const duration = data.duration ?? (existing.duration as BillingDiscountDurationDto);

    const valueMinor = data.valueMinor !== undefined ? data.valueMinor : existing.valueMinor;
    const percentage = data.percentage !== undefined ? data.percentage : existing.percentage;
    const maxDiscountMinor =
      data.maxDiscountMinor !== undefined ? data.maxDiscountMinor : existing.maxDiscountMinor;
    const durationCycles =
      data.durationCycles !== undefined ? data.durationCycles : existing.durationCycles;
    const startsAt = data.startsAt ?? (existing.startsAt ? new Date(String(existing.startsAt)).toISOString() : null);
    const expiresAt = data.expiresAt ?? (existing.expiresAt ? new Date(String(existing.expiresAt)).toISOString() : null);

    this.validateDefinition({
      type,
      valueMinor,
      percentage,
      maxDiscountMinor,
      duration,
      durationCycles,
      startsAt,
      expiresAt,
    });

    if (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit < 1) {
      throw new ConflictException('usageLimit harus lebih dari 0');
    }

    if (
      data.usageLimit !== undefined &&
      data.usageLimit !== null &&
      data.usageLimit < existing.usageCount
    ) {
      throw new ConflictException('usageLimit tidak boleh lebih kecil dari usageCount saat ini');
    }

    const updated = await this.prisma.client.orm.public.Discount
      .where({ id })
      .update({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.type !== undefined
          ? {
              type,
              valueMinor: type === BillingDiscountTypeDto.FIXED_AMOUNT ? valueMinor : null,
              percentage: type === BillingDiscountTypeDto.PERCENTAGE ? percentage : null,
            }
          : {}),
        ...(data.valueMinor !== undefined ? { valueMinor: type === BillingDiscountTypeDto.FIXED_AMOUNT ? data.valueMinor : null } : {}),
        ...(data.percentage !== undefined ? { percentage: type === BillingDiscountTypeDto.PERCENTAGE ? data.percentage : null } : {}),
        ...(data.maxDiscountMinor !== undefined ? { maxDiscountMinor: data.maxDiscountMinor } : {}),
        ...(data.minimumAmountMinor !== undefined ? { minimumAmountMinor: data.minimumAmountMinor } : {}),
        ...(data.duration !== undefined
          ? {
              duration,
              durationCycles: duration === BillingDiscountDurationDto.RECURRING_CYCLES ? durationCycles : null,
            }
          : {}),
        ...(data.durationCycles !== undefined && duration === BillingDiscountDurationDto.RECURRING_CYCLES
          ? { durationCycles: data.durationCycles }
          : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      });

    if (!updated) throw new NotFoundException('Discount gagal diperbarui');
    return updated;
  }

  async setPackage(
    discountId: string,
    packageId: string,
    data: SetDiscountPackageDto,
  ): Promise<BillingDiscountPackageResponse | BillingDiscountMessageResponse> {
    await this.findOne(discountId);

    const pkg = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id: packageId })
      .first();

    if (!pkg) throw new NotFoundException('Package tidak ditemukan');

    const existing = await this.prisma.client.orm.public.DiscountPackage
      .where({ discountId, packageId })
      .first();

    if (data.enabled) {
      if (existing) return existing;

      return this.prisma.client.orm.public.DiscountPackage.create({
        discountId,
        packageId,
      });
    }

    if (!existing) {
      throw new NotFoundException('Discount belum dipasang pada package');
    }

    await this.prisma.client.orm.public.DiscountPackage
      .where({ discountId, packageId })
      .delete();

    return { message: 'Discount berhasil dilepas dari package' };
  }

  async getPackages(discountId: string) {
    await this.findOne(discountId);

    return this.prisma.client.orm.public.DiscountPackage
      .where({ discountId })
      .select('id', 'packageId', 'createdAt')
      .all();
  }
}
