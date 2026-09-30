import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
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
  constructor(private readonly prisma: PrismaService) {}

  private async getActiveSubscription(tenantId: string, userId: string) {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();
    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');

    const subscriptions = await this.prisma.client.orm.public.TenantSubscription
      .where({ tenantId })
      .all();

    const active = subscriptions
      .filter((item) => ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)))
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

    const invoice = await this.prisma.client.orm.public.SubscriptionInvoice.create({
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

    if (!invoice) throw new ConflictException('Invoice gagal dibuat');

    if (result.discount) {
      await this.prisma.client.orm.public.InvoiceDiscount.create({
        invoiceId: invoice.id,
        discountId: result.discount.id,
        codeSnapshot: result.discount.code,
        discountType: result.discount.type,
        discountValueMinor: result.discount.valueMinor,
        discountPercentage: result.discount.percentage,
        amountMinor: result.discountAmountMinor,
      });

      await this.prisma.client.orm.public.DiscountUsage.create({
        discountId: result.discount.id,
        tenantId,
        subscriptionId: result.subscription.id,
        invoiceId: invoice.id,
        usedAt: now,
      });

      await this.prisma.client.orm.public.Discount
        .where({ id: result.discount.id })
        .update({
          usageCount: Number(result.discount.usageCount) + 1,
        });
    }

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
  }
}
