import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  BillingDiscountDurationDto,
  BillingDiscountTypeDto,
  CreateDiscountDto,
} from './dto/create-discount.dto.js';
import { SetDiscountPackageDto } from './dto/set-discount-package.dto.js';
import { UpdateDiscountDto } from './dto/update-discount.dto.js';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'sqlState' in error && String((error as { sqlState?: unknown }).sqlState) === '23505';
}


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
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingDiscountPackageResponse {
  id: string;
  discountId: string;
  packageId: string;
  createdAt: string;
}

export interface BillingDiscountMessageResponse {
  message: string;
}

@Injectable()
export class BillingDiscountService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

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
      if (new Date(data.startsAt).getTime() >= new Date(data.expiresAt).getTime()) {
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
        'id', 'code', 'name', 'description', 'type', 'valueMinor', 'percentage',
        'maxDiscountMinor', 'minimumAmountMinor', 'duration', 'durationCycles',
        'usageLimit', 'usageCount', 'startsAt', 'expiresAt', 'isActive',
        'createdAt', 'updatedAt',
      )
      .all();
  }

  async findOne(id: string): Promise<BillingDiscountResponse> {
    const discount = await this.prisma.client.orm.public.Discount
      .where({ id })
      .select(
        'id', 'code', 'name', 'description', 'type', 'valueMinor', 'percentage',
        'maxDiscountMinor', 'minimumAmountMinor', 'duration', 'durationCycles',
        'usageLimit', 'usageCount', 'startsAt', 'expiresAt', 'isActive',
        'createdAt', 'updatedAt',
      )
      .first();

    if (!discount) throw new NotFoundException('Discount tidak ditemukan');
    return discount;
  }

  async create(data: CreateDiscountDto): Promise<BillingDiscountResponse> {
    const code = data.code.trim().toUpperCase();
    if (await this.prisma.client.orm.public.Discount.where({ code }).first()) {
      throw new ConflictException('Discount dengan code tersebut sudah ada');
    }

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

    let created: BillingDiscountResponse;
    try {
      created = await this.prisma.client.orm.public.Discount.create({
        code,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        type: data.type,
        valueMinor: data.type === BillingDiscountTypeDto.FIXED_AMOUNT ? data.valueMinor : null,
        percentage: data.type === BillingDiscountTypeDto.PERCENTAGE ? data.percentage : null,
        maxDiscountMinor: data.maxDiscountMinor ?? null,
        minimumAmountMinor: data.minimumAmountMinor ?? null,
        duration,
        durationCycles: duration === BillingDiscountDurationDto.RECURRING_CYCLES ? data.durationCycles : null,
        usageLimit: data.usageLimit ?? null,
        startsAt: data.startsAt ?? null,
        expiresAt: data.expiresAt ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Discount dengan code tersebut sudah ada');
      }
      throw error;
    }
    await this.auditService.create({ action: 'BILLING.DISCOUNT_CREATED', entity: 'Discount', entityId: created.id, description: `Discount ${created.code} dibuat`, metadata: { code: created.code, type: created.type } });
    return created;
  }

  async update(id: string, data: UpdateDiscountDto): Promise<BillingDiscountResponse> {
    const protectedFieldsChanged =
      data.type !== undefined ||
      data.valueMinor !== undefined ||
      data.percentage !== undefined ||
      data.maxDiscountMinor !== undefined ||
      data.minimumAmountMinor !== undefined ||
      data.duration !== undefined ||
      data.durationCycles !== undefined ||
      data.usageLimit !== undefined ||
      data.startsAt !== undefined ||
      data.expiresAt !== undefined;

    const updated = await this.prisma.client.transaction(async (tx) => {
      // Serialize discount definition updates with invoice discount consumption.
      // The invoice flow locks the same row before reading usageCount, so an
      // update cannot pass the usage check against a stale snapshot.
      const lockPlan = this.prisma.client.raw.sql`
        UPDATE "public"."discount"
        SET "updatedAt" = "updatedAt"
        WHERE "id" = ${id}
      `.affectedCount().build();

      await tx.execute(lockPlan);

      const existing = await tx.orm.public.Discount.where({ id }).first();
      if (!existing) throw new NotFoundException('Discount tidak ditemukan');

      if (existing.usageCount > 0 && protectedFieldsChanged) {
        throw new ConflictException(
          'Definisi discount tidak dapat diubah setelah discount pernah digunakan. Nonaktifkan discount dan buat discount baru untuk mengubah aturan.',
        );
      }

      const type = data.type ?? (existing.type as BillingDiscountTypeDto);
      const duration = data.duration ?? (existing.duration as BillingDiscountDurationDto);
      const valueMinor = data.valueMinor !== undefined ? data.valueMinor : existing.valueMinor;
      const percentage = data.percentage !== undefined ? data.percentage : existing.percentage;
      const maxDiscountMinor = data.maxDiscountMinor !== undefined ? data.maxDiscountMinor : existing.maxDiscountMinor;
      const durationCycles = data.durationCycles !== undefined ? data.durationCycles : existing.durationCycles;
      const startsAt = data.startsAt ?? existing.startsAt;
      const expiresAt = data.expiresAt ?? existing.expiresAt;

      this.validateDefinition({
        type, valueMinor, percentage, maxDiscountMinor, duration, durationCycles, startsAt, expiresAt,
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

      const result = await tx.orm.public.Discount
        .where({ id })
        .update({
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
          ...(data.type !== undefined ? {
            type,
            valueMinor: type === BillingDiscountTypeDto.FIXED_AMOUNT ? valueMinor : null,
            percentage: type === BillingDiscountTypeDto.PERCENTAGE ? percentage : null,
          } : {}),
          ...(data.valueMinor !== undefined ? { valueMinor: type === BillingDiscountTypeDto.FIXED_AMOUNT ? data.valueMinor : null } : {}),
          ...(data.percentage !== undefined ? { percentage: type === BillingDiscountTypeDto.PERCENTAGE ? data.percentage : null } : {}),
          ...(data.maxDiscountMinor !== undefined ? { maxDiscountMinor: data.maxDiscountMinor } : {}),
          ...(data.minimumAmountMinor !== undefined ? { minimumAmountMinor: data.minimumAmountMinor } : {}),
          ...(data.duration !== undefined ? {
            duration,
            durationCycles: duration === BillingDiscountDurationDto.RECURRING_CYCLES ? durationCycles : null,
          } : {}),
          ...(data.durationCycles !== undefined && duration === BillingDiscountDurationDto.RECURRING_CYCLES
            ? { durationCycles: data.durationCycles } : {}),
          ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
          ...(data.startsAt !== undefined ? { startsAt: data.startsAt || null } : {}),
          ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt || null } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        });

      if (!result) throw new NotFoundException('Discount gagal diperbarui');
      return result;
    });

    await this.auditService.create({
      action: 'BILLING.DISCOUNT_UPDATED',
      entity: 'Discount',
      entityId: id,
      description: `Discount ${updated.code} diperbarui`,
      metadata: data,
    });
    return updated;
  }

  async setPackage(
    discountId: string,
    packageId: string,
    data: SetDiscountPackageDto,
  ): Promise<BillingDiscountPackageResponse | BillingDiscountMessageResponse> {
    await this.findOne(discountId);
    if (!await this.prisma.client.orm.public.SubscriptionPackage.where({ id: packageId }).first()) {
      throw new NotFoundException('Package tidak ditemukan');
    }

    const existing = await this.prisma.client.orm.public.DiscountPackage
      .where({ discountId, packageId })
      .first();

    if (data.enabled) {
      if (existing) return existing;
      try {
        return await this.prisma.client.orm.public.DiscountPackage.create({ discountId, packageId });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return (await this.prisma.client.orm.public.DiscountPackage
            .where({ discountId, packageId })
            .first()) ?? (() => { throw new ConflictException('Discount sudah terpasang pada package'); })();
        }
        throw error;
      }
    }

    if (!existing) throw new NotFoundException('Discount belum dipasang pada package');

    await this.prisma.client.orm.public.DiscountPackage
      .where({ discountId, packageId })
      .delete();

    return { message: 'Discount berhasil dilepas dari package' };
  }

  async getPackages(discountId: string): Promise<BillingDiscountPackageResponse[]> {
    await this.findOne(discountId);
    return this.prisma.client.orm.public.DiscountPackage
      .where({ discountId })
      .select('id', 'discountId', 'packageId', 'createdAt')
      .all();
  }
}
