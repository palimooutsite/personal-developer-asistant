import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateInvoiceDto, PreviewInvoiceDto } from './dto/preview-invoice.dto.js';

export interface BillingInvoiceResponse {
  id?: string;
  tenantId: string;
  subscriptionId: string;
  packagePriceId: string;
  packageCode: string;
  packageName: string;
  billingPeriod: string;
  currency: string;
  originalAmountMinor: number;
  discountAmountMinor: number;
  taxAmountMinor: number;
  finalAmountMinor: number;
  status?: string;
  issuedAt?: unknown;
  dueAt?: unknown;
  discounts: Array<{
    discountId: string;
    code: string;
    type: string;
    amountMinor: number;
  }>;
}

@Injectable()
export class BillingInvoiceService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async getActiveSubscription(tenantId: string, userId: string) {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();
    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');

    const subscriptions = await this.prisma.client.orm.public.TenantSubscription
      .where({ tenantId })
      .all();

    const active = subscriptions
      .filter((item) => ['PENDING', 'TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

    if (!active) throw new ConflictException('Workspace belum memiliki subscription aktif');

    return active;
  }

  private async calculate(
    tenantId: string,
    userId: string,
    discountCode?: string,
  ) {
    const subscription = await this.getActiveSubscription(tenantId, userId);

    const pkg = await this.prisma.client.orm.public.SubscriptionPackage
      .where({ id: subscription.packageId })
      .first();
    if (!pkg) throw new NotFoundException('Package subscription tidak ditemukan');

    const price = await this.prisma.client.orm.public.SubscriptionPackagePrice
      .where({ id: subscription.packagePriceId })
      .first();
    if (!price) throw new NotFoundException('Harga subscription tidak ditemukan');

    if (price.packageId !== pkg.id) {
      throw new ConflictException('Harga subscription tidak sesuai dengan package');
    }

    const originalAmountMinor = price.amountMinor;
    let discountAmountMinor = 0;
    const discounts: BillingInvoiceResponse['discounts'] = [];
    let discount: any = null;

    if (discountCode?.trim()) {
      const code = discountCode.trim().toUpperCase();
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
        throw new ConflictException('Nilai invoice belum memenuhi minimum amount discount');
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

      const previousUsages = await this.prisma.client.orm.public.DiscountUsage
        .where({ discountId: discount.id, tenantId })
        .all();

      if (discount.duration === 'ONCE' && previousUsages.length > 0) {
        throw new ConflictException('Discount hanya dapat digunakan satu kali untuk workspace ini');
      }

      if (
        discount.duration === 'RECURRING_CYCLES' &&
        discount.durationCycles !== null &&
        previousUsages.length >= discount.durationCycles
      ) {
        throw new ConflictException('Masa penggunaan discount untuk workspace ini sudah habis');
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

      discounts.push({
        discountId: discount.id,
        code: discount.code,
        type: discount.type,
        amountMinor: discountAmountMinor,
      });
    }

    const taxAmountMinor = 0;
    const finalAmountMinor = Math.max(
      originalAmountMinor - discountAmountMinor + taxAmountMinor,
      0,
    );

    return {
      subscription,
      package: pkg,
      price,
      discount,
      originalAmountMinor,
      discountAmountMinor,
      taxAmountMinor,
      finalAmountMinor,
      discounts,
    };
  }


  async list(
    tenantId: string,
    userId: string,
  ): Promise<BillingInvoiceResponse[]> {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();
    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');

    const invoices = await this.prisma.client.orm.public.SubscriptionInvoice
      .where({ tenantId })
      .all();

    return invoices
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((invoice) => ({
        id: invoice.id,
        tenantId: invoice.tenantId,
        subscriptionId: invoice.subscriptionId,
        packagePriceId: invoice.packagePriceId,
        packageCode: invoice.packageCode,
        packageName: invoice.packageName,
        billingPeriod: invoice.billingPeriod,
        currency: invoice.currency,
        originalAmountMinor: invoice.originalAmountMinor,
        discountAmountMinor: invoice.discountAmountMinor,
        taxAmountMinor: invoice.taxAmountMinor,
        finalAmountMinor: invoice.finalAmountMinor,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        discounts: [],
      }));
  }

  async findOne(
    tenantId: string,
    userId: string,
    invoiceId: string,
  ): Promise<BillingInvoiceResponse> {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();
    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');

    const invoice = await this.prisma.client.orm.public.SubscriptionInvoice
      .where({ id: invoiceId, tenantId })
      .first();
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');

    const discounts = await this.prisma.client.orm.public.InvoiceDiscount
      .where({ invoiceId })
      .all();

    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      subscriptionId: invoice.subscriptionId,
      packagePriceId: invoice.packagePriceId,
      packageCode: invoice.packageCode,
      packageName: invoice.packageName,
      billingPeriod: invoice.billingPeriod,
      currency: invoice.currency,
      originalAmountMinor: invoice.originalAmountMinor,
      discountAmountMinor: invoice.discountAmountMinor,
      taxAmountMinor: invoice.taxAmountMinor,
      finalAmountMinor: invoice.finalAmountMinor,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      discounts: discounts.map((discount) => ({
        discountId: discount.discountId,
        code: discount.codeSnapshot,
        type: discount.discountType,
        amountMinor: discount.amountMinor,
      })),
    };
  }

  async preview(
    tenantId: string,
    userId: string,
    data: PreviewInvoiceDto,
  ): Promise<BillingInvoiceResponse> {
    const result = await this.calculate(tenantId, userId, data.discountCode);
    return {
      tenantId,
      subscriptionId: result.subscription.id,
      packagePriceId: result.price.id,
      packageCode: result.package.code,
      packageName: result.package.name,
      billingPeriod: result.price.billingPeriod,
      currency: result.price.currency,
      originalAmountMinor: result.originalAmountMinor,
      discountAmountMinor: result.discountAmountMinor,
      taxAmountMinor: result.taxAmountMinor,
      finalAmountMinor: result.finalAmountMinor,
      discounts: result.discounts,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: CreateInvoiceDto,
  ): Promise<BillingInvoiceResponse> {
    const result = await this.calculate(tenantId, userId, data.discountCode);
    const now = new Date().toISOString();

    try {
      const invoice = await this.prisma.client.transaction(async (tx) => {
        let discount = result.discount;

        if (discount) {
          // Serialize concurrent consumption attempts for the same discount.
          // The no-op UPDATE acquires PostgreSQL's row lock without changing
          // usageCount, so usage-limit checks below see the latest committed value.
          const lockPlan = this.prisma.client.raw.sql`
            UPDATE "Discount"
            SET "usageCount" = "usageCount"
            WHERE "id" = ${discount.id}
          `.affectedCount().build();

          await tx.execute(lockPlan);

          discount = await tx.orm.public.Discount
            .where({ id: result.discount.id })
            .first();

          if (!discount) {
            throw new NotFoundException('Discount tidak ditemukan');
          }

          if (
            discount.usageLimit !== null &&
            Number(discount.usageCount) >= discount.usageLimit
          ) {
            throw new ConflictException('Batas penggunaan discount sudah tercapai');
          }

          const previousUsages = await tx.orm.public.DiscountUsage
            .where({ discountId: discount.id, tenantId })
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
        }

        const createdInvoice = await tx.orm.public.SubscriptionInvoice.create({
          tenantId,
          subscriptionId: result.subscription.id,
          packagePriceId: result.price.id,
          packageCode: result.package.code,
          packageName: result.package.name,
          billingPeriod: result.price.billingPeriod,
          currency: result.price.currency,
          originalAmountMinor: result.originalAmountMinor,
          discountAmountMinor: result.discountAmountMinor,
          taxAmountMinor: result.taxAmountMinor,
          finalAmountMinor: result.finalAmountMinor,
          status: 'PENDING',
          issuedAt: now,
          dueAt: now,
        });

        if (!createdInvoice) {
          throw new ConflictException('Invoice gagal dibuat');
        }

        if (discount) {
          await tx.orm.public.InvoiceDiscount.create({
            invoiceId: createdInvoice.id,
            discountId: discount.id,
            codeSnapshot: discount.code,
            discountType: discount.type,
            discountValueMinor: discount.valueMinor,
            discountPercentage: discount.percentage,
            amountMinor: result.discountAmountMinor,
          });

          await tx.orm.public.DiscountUsage.create({
            discountId: discount.id,
            tenantId,
            subscriptionId: result.subscription.id,
            invoiceId: createdInvoice.id,
            onceUsageKey:
              discount.duration === 'ONCE'
                ? `${discount.id}:${tenantId}`
                : null,
            usedAt: now,
          });

          const incrementPlan = this.prisma.client.raw.sql`
            UPDATE "Discount"
            SET "usageCount" = "usageCount" + 1
            WHERE "id" = ${discount.id}
          `.affectedCount().build();

          const incrementResult = await tx.execute(incrementPlan);
          if (incrementResult.affectedRows !== 1) {
            throw new ConflictException('Discount gagal diperbarui');
          }
        }

        return createdInvoice;
      });

      await this.auditService.create({
        action: 'BILLING.INVOICE_CREATED',
        entity: 'SubscriptionInvoice',
        entityId: invoice.id,
        tenantId,
        userId,
        description: `Invoice ${invoice.id} dibuat`,
        metadata: {
          subscriptionId: result.subscription.id,
          packageCode: result.package.code,
          finalAmountMinor: result.finalAmountMinor,
        },
      });

      return {
        id: invoice.id,
        tenantId,
        subscriptionId: result.subscription.id,
        packagePriceId: result.price.id,
        packageCode: result.package.code,
        packageName: result.package.name,
        billingPeriod: result.price.billingPeriod,
        currency: result.price.currency,
        originalAmountMinor: result.originalAmountMinor,
        discountAmountMinor: result.discountAmountMinor,
        taxAmountMinor: result.taxAmountMinor,
        finalAmountMinor: result.finalAmountMinor,
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        discounts: result.discounts,
      };
    } catch (error) {
      const sqlState =
        typeof error === 'object' &&
        error !== null &&
        'sqlState' in error
          ? String((error as { sqlState?: unknown }).sqlState)
          : '';

      if (sqlState === '23505') {
        throw new ConflictException(
          'Discount hanya dapat digunakan satu kali untuk workspace ini',
        );
      }

      throw error;
    }
  }
}
