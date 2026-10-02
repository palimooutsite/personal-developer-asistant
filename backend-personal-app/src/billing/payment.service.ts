import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { BillingPaymentProviderDto } from './dto/create-payment.dto.js';

export interface BillingPaymentResponse {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceId: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  amountMinor: number;
  currency: string;
  checkoutUrl: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

@Injectable()
export class BillingPaymentService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  private async ensureMember(tenantId: string, userId: string) {
    const member = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .first();
    if (!member) throw new NotFoundException('Workspace member tidak ditemukan');
  }

  private async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.client.orm.public.SubscriptionInvoice
      .where({ id: invoiceId, tenantId })
      .first();
    if (!invoice) throw new NotFoundException('Invoice tidak ditemukan');
    return invoice;
  }

  private toResponse(payment: any): BillingPaymentResponse {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      subscriptionId: payment.subscriptionId,
      invoiceId: payment.invoiceId,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? null,
      status: payment.status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      checkoutUrl: payment.checkoutUrl ?? null,
      paidAt: payment.paidAt ?? null,
      expiresAt: payment.expiresAt ?? null,
      createdAt: payment.createdAt,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    invoiceId: string,
    provider: BillingPaymentProviderDto,
  ): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);

    if (provider !== BillingPaymentProviderDto.SANDBOX) {
      throw new ConflictException(
        'Payment provider tersebut belum diimplementasikan',
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      const payment = await this.prisma.client.transaction(async (tx) => {
        // Serialize payment creation for the same invoice. This prevents two
        // concurrent requests from both observing "no pending payment".
        const lockPlan = this.prisma.client.raw.sql`
          UPDATE "public"."subscriptionInvoice"
          SET "updatedAt" = "updatedAt"
          WHERE "id" = ${invoiceId}
            AND "tenantId" = ${tenantId}
        `.affectedCount().build();

        await tx.execute(lockPlan);

        const invoice = await tx.orm.public.SubscriptionInvoice
          .where({ id: invoiceId, tenantId })
          .first();

        if (!invoice) {
          throw new NotFoundException('Invoice tidak ditemukan');
        }

        if (invoice.status !== 'PENDING') {
          throw new ConflictException('Invoice tidak dalam status PENDING');
        }

        const existing = await tx.orm.public.Payment
          .where({ invoiceId })
          .all();

        const pending = existing.find((item) => item.status === 'PENDING');
        if (pending) {
          return { payment: pending, created: false };
        }

        const created = await tx.orm.public.Payment.create({
          tenantId,
          subscriptionId: invoice.subscriptionId,
          invoiceId: invoice.id,
          provider,
          providerPaymentId: 'SANDBOX-' + invoice.id,
          status: 'PENDING',
          amountMinor: invoice.finalAmountMinor,
          currency: invoice.currency,
          checkoutUrl: 'sandbox://payment/' + invoice.id,
          expiresAt,
        });

        if (!created) {
          throw new ConflictException('Payment gagal dibuat');
        }

        return { payment: created, created: true };
      });

      if (payment.created) {
        await this.auditService.create({
        action: 'BILLING.PAYMENT_CREATED',
        entity: 'Payment',
          entityId: payment.payment.id,
          tenantId,
          userId,
          description: `Payment untuk invoice ${invoiceId} dibuat`,
          metadata: {
            invoiceId,
            amountMinor: payment.payment.amountMinor,
            provider: payment.payment.provider,
          },
      });
      }

      return this.toResponse(payment.payment);
    } catch (error) {
      // A unique provider payment ID may be the winner of a concurrent
      // request. Return that existing payment instead of surfacing a
      // duplicate-key failure to the caller.
      const existing = await this.prisma.client.orm.public.Payment
        .where({ invoiceId, tenantId })
        .all();
      const pending = existing.find((item) => item.status === 'PENDING');

      if (pending) {
        return this.toResponse(pending);
      }

      throw error;
    }
  }

  async list(tenantId: string, userId: string): Promise<BillingPaymentResponse[]> {
    await this.ensureMember(tenantId, userId);
    const payments = await this.prisma.client.orm.public.Payment.where({ tenantId }).all();
    return payments
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((payment) => this.toResponse(payment));
  }

  async findOne(tenantId: string, userId: string, paymentId: string): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);
    const payment = await this.prisma.client.orm.public.Payment.where({ id: paymentId, tenantId }).first();
    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    return this.toResponse(payment);
  }

  async sandboxSucceed(
    tenantId: string,
    userId: string,
    paymentId: string,
  ): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);

    const payment = await this.prisma.client.orm.public.Payment
      .where({ id: paymentId, tenantId })
      .first();

    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    if (payment.provider !== 'SANDBOX') {
      throw new ConflictException('Simulasi hanya tersedia untuk SANDBOX');
    }

    if (payment.status === 'SUCCEEDED') {
      return this.toResponse(payment);
    }

    if (payment.status !== 'PENDING') {
      throw new ConflictException('Payment tidak dalam status PENDING');
    }

    const now = new Date().toISOString();

    const updatedPayment = await this.prisma.client.transaction(async (tx) => {
      const invoice = await tx.orm.public.SubscriptionInvoice
        .where({ id: payment.invoiceId, tenantId })
        .first();

      if (!invoice) {
        throw new ConflictException('Invoice terkait payment tidak ditemukan');
      }

      const subscription = await tx.orm.public.TenantSubscription
        .where({ id: payment.subscriptionId, tenantId })
        .first();

      if (!subscription) {
        throw new ConflictException('Subscription terkait payment tidak ditemukan');
      }

      // A payment must settle the exact invoice and subscription it belongs to.
      // Foreign keys alone do not guarantee this cross-entity invariant.
      if (invoice.subscriptionId !== subscription.id) {
        throw new ConflictException(
          'Invoice dan subscription terkait payment tidak konsisten',
        );
      }

      if (invoice.finalAmountMinor !== payment.amountMinor || invoice.currency !== payment.currency) {
        throw new ConflictException(
          'Nominal atau currency payment tidak sesuai dengan invoice',
        );
      }

      if (subscription.status !== 'PENDING') {
        throw new ConflictException(
          'Subscription terkait payment tidak dalam status PENDING',
        );
      }

      if (invoice.status !== 'PENDING') {
        throw new ConflictException(
          'Invoice terkait payment tidak dalam status PENDING',
        );
      }

      const claimed = await tx.orm.public.Payment
        .where({ id: paymentId, tenantId, status: 'PENDING' })
        .update({ status: 'SUCCEEDED', paidAt: now });

      if (!claimed) {
        const current = await tx.orm.public.Payment
          .where({ id: paymentId, tenantId })
          .first();

        if (current?.status === 'SUCCEEDED') {
          return current;
        }

        throw new ConflictException('Payment sudah berubah status');
      }

      const updatedInvoice = await tx.orm.public.SubscriptionInvoice
        .where({ id: invoice.id, tenantId, status: 'PENDING' })
        .update({ status: 'SUCCEEDED', paidAt: now });

      if (!updatedInvoice) {
        const invoice = await tx.orm.public.SubscriptionInvoice
          .where({ id: payment.invoiceId, tenantId })
          .first();

        if (invoice?.status !== 'SUCCEEDED') {
          throw new ConflictException('Invoice gagal diperbarui');
        }
      }

      const updatedSubscription = await tx.orm.public.TenantSubscription
        .where({ id: subscription.id, tenantId, status: 'PENDING' })
        .update({
          status: 'ACTIVE',
          startedAt: now,
          currentPeriodStart: now,
        });

      if (!updatedSubscription) {
        const subscription = await tx.orm.public.TenantSubscription
          .where({ id: payment.subscriptionId, tenantId })
          .first();

        if (subscription?.status !== 'ACTIVE') {
          throw new ConflictException('Subscription gagal diaktifkan');
        }
      }

      return tx.orm.public.Payment
        .where({ id: paymentId, tenantId })
        .first();
    });

    if (!updatedPayment) {
      throw new ConflictException('Payment gagal diperbarui');
    }

    await this.auditService.create({
      action: 'BILLING.PAYMENT_SUCCEEDED',
      entity: 'Payment',
      entityId: updatedPayment.id,
      tenantId,
      userId,
      description: 'Payment berhasil',
      metadata: {
        invoiceId: payment.invoiceId,
        subscriptionId: payment.subscriptionId,
        amountMinor: payment.amountMinor,
      },
    });

    return this.toResponse(updatedPayment);
  }

  async sandboxFail(tenantId: string, userId: string, paymentId: string): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);

    const payment = await this.prisma.client.orm.public.Payment
      .where({ id: paymentId, tenantId })
      .first();

    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    if (payment.provider !== 'SANDBOX') {
      throw new ConflictException('Simulasi hanya tersedia untuk SANDBOX');
    }

    if (payment.status === 'FAILED') {
      return this.toResponse(payment);
    }

    if (payment.status !== 'PENDING') {
      throw new ConflictException('Payment tidak dalam status PENDING');
    }

    const updatedPayment = await this.prisma.client.transaction(async (tx) => {
      // Validate the complete payment relationship before claiming the payment.
      // If any invariant is invalid, the payment must remain PENDING.
      const invoice = await tx.orm.public.SubscriptionInvoice
        .where({ id: payment.invoiceId, tenantId })
        .first();

      if (!invoice) {
        throw new ConflictException('Invoice terkait payment tidak ditemukan');
      }

      const subscription = await tx.orm.public.TenantSubscription
        .where({ id: payment.subscriptionId, tenantId })
        .first();

      if (!subscription) {
        throw new ConflictException('Subscription terkait payment tidak ditemukan');
      }

      if (invoice.subscriptionId !== subscription.id) {
        throw new ConflictException(
          'Invoice dan subscription terkait payment tidak konsisten',
        );
      }

      if (
        invoice.finalAmountMinor !== payment.amountMinor ||
        invoice.currency !== payment.currency
      ) {
        throw new ConflictException(
          'Nominal atau currency payment tidak sesuai dengan invoice',
        );
      }

      if (invoice.status !== 'PENDING') {
        throw new ConflictException(
          'Invoice terkait payment sudah berubah status sehingga payment gagal tidak dapat diproses',
        );
      }

      if (subscription.status !== 'PENDING') {
        throw new ConflictException(
          'Subscription terkait payment sudah berubah status sehingga payment gagal tidak dapat diproses',
        );
      }

      const claimed = await tx.orm.public.Payment
        .where({ id: paymentId, tenantId, status: 'PENDING' })
        .update({ status: 'FAILED' });

      if (!claimed) {
        const current = await tx.orm.public.Payment
          .where({ id: paymentId, tenantId })
          .first();

        if (!current) {
          throw new NotFoundException('Payment tidak ditemukan');
        }

        if (current.status === 'FAILED') {
          return current;
        }

        if (current.status === 'SUCCEEDED') {
          throw new ConflictException('Payment sudah berhasil diselesaikan');
        }

        throw new ConflictException('Payment sedang diproses atau sudah berubah status');
      }

      return tx.orm.public.Payment
        .where({ id: paymentId, tenantId })
        .first();
    });

    if (!updatedPayment) {
      throw new ConflictException('Payment gagal diperbarui');
    }

    await this.auditService.create({
      action: 'BILLING.PAYMENT_FAILED',
      entity: 'Payment',
      entityId: updatedPayment.id,
      tenantId,
      userId,
      description: 'Payment gagal',
      metadata: {
        invoiceId: payment.invoiceId,
        subscriptionId: payment.subscriptionId,
        amountMinor: payment.amountMinor,
      },
    });

    return this.toResponse(updatedPayment);
  }
}
