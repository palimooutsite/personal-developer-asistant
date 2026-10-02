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

  async create(tenantId: string, userId: string, invoiceId: string, provider: BillingPaymentProviderDto): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);
    const invoice = await this.getInvoice(tenantId, invoiceId);

    if (invoice.status !== 'PENDING') {
      throw new ConflictException('Invoice tidak dalam status PENDING');
    }
    if (provider !== BillingPaymentProviderDto.SANDBOX) {
      throw new ConflictException('Payment provider tersebut belum diimplementasikan');
    }

    const existing = await this.prisma.client.orm.public.Payment.where({ invoiceId }).all();
    const pending = existing.find((payment) => payment.status === 'PENDING');
    if (pending) return this.toResponse(pending);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payment = await this.prisma.client.orm.public.Payment.create({
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

    if (!payment) throw new ConflictException('Payment gagal dibuat');
    await this.auditService.create({ action: 'BILLING.PAYMENT_CREATED', entity: 'Payment', entityId: payment.id, tenantId, userId, description: `Payment untuk invoice ${invoice.id} dibuat`, metadata: { invoiceId: invoice.id, amountMinor: payment.amountMinor, provider: payment.provider } });
    return this.toResponse(payment);
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

  async sandboxSucceed(tenantId: string, userId: string, paymentId: string): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);
    const payment = await this.prisma.client.orm.public.Payment.where({ id: paymentId, tenantId }).first();

    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    if (payment.provider !== 'SANDBOX') throw new ConflictException('Simulasi hanya tersedia untuk SANDBOX');
    if (payment.status !== 'PENDING') throw new ConflictException('Payment tidak dalam status PENDING');

    const now = new Date().toISOString();

    const updatedPayment = await this.prisma.client.orm.public.Payment
      .where({ id: paymentId })
      .update({ status: 'SUCCEEDED', paidAt: now });

    await this.prisma.client.orm.public.SubscriptionInvoice
      .where({ id: payment.invoiceId, tenantId })
      .update({ status: 'SUCCEEDED', paidAt: now });

    await this.prisma.client.orm.public.TenantSubscription
      .where({ id: payment.subscriptionId, tenantId })
      .update({
        status: 'ACTIVE',
        startedAt: now,
        currentPeriodStart: now,
      });

    if (!updatedPayment) throw new ConflictException('Payment gagal diperbarui');
    await this.auditService.create({ action: 'BILLING.PAYMENT_SUCCEEDED', entity: 'Payment', entityId: updatedPayment.id, tenantId, userId, description: 'Payment berhasil', metadata: { invoiceId: payment.invoiceId, subscriptionId: payment.subscriptionId, amountMinor: payment.amountMinor } });
    return this.toResponse(updatedPayment);
  }

  async sandboxFail(tenantId: string, userId: string, paymentId: string): Promise<BillingPaymentResponse> {
    await this.ensureMember(tenantId, userId);
    const payment = await this.prisma.client.orm.public.Payment.where({ id: paymentId, tenantId }).first();

    if (!payment) throw new NotFoundException('Payment tidak ditemukan');
    if (payment.provider !== 'SANDBOX') throw new ConflictException('Simulasi hanya tersedia untuk SANDBOX');
    if (payment.status !== 'PENDING') throw new ConflictException('Payment tidak dalam status PENDING');

    const updatedPayment = await this.prisma.client.orm.public.Payment
      .where({ id: paymentId })
      .update({ status: 'FAILED' });

    if (!updatedPayment) throw new ConflictException('Payment gagal diperbarui');
    await this.auditService.create({ action: 'BILLING.PAYMENT_FAILED', entity: 'Payment', entityId: updatedPayment.id, tenantId, userId, description: 'Payment gagal', metadata: { invoiceId: payment.invoiceId, subscriptionId: payment.subscriptionId, amountMinor: payment.amountMinor } });
    return this.toResponse(updatedPayment);
  }
}
