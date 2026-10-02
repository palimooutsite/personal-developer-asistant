import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AdminInvoiceListItem {
  id: string;
  tenantId: string;
  workspaceName: string;
  subscriptionId: string;
  packageName: string;
  packageCode: string;
  billingPeriod: string;
  currency: string;
  originalAmountMinor: number;
  discountAmountMinor: number;
  taxAmountMinor: number;
  finalAmountMinor: number;
  status: string;
  paymentStatus: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

@Injectable()
export class BillingAdminInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminInvoiceListItem[]> {
    const invoices = await this.prisma.client.orm.public.SubscriptionInvoice.all();
    const result: AdminInvoiceListItem[] = [];

    for (const invoice of invoices) {
      const tenant = await this.prisma.client.orm.public.Tenant
        .where({ id: invoice.tenantId })
        .select('id', 'name')
        .first();

      if (!tenant) continue;

      const payments = await this.prisma.client.orm.public.Payment
        .where({ invoiceId: invoice.id })
        .all();

      const latestPayment = payments
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

      result.push({
        id: invoice.id,
        tenantId: invoice.tenantId,
        workspaceName: tenant.name,
        subscriptionId: invoice.subscriptionId,
        packageName: invoice.packageName,
        packageCode: invoice.packageCode,
        billingPeriod: String(invoice.billingPeriod),
        currency: String(invoice.currency),
        originalAmountMinor: Number(invoice.originalAmountMinor),
        discountAmountMinor: Number(invoice.discountAmountMinor),
        taxAmountMinor: Number(invoice.taxAmountMinor),
        finalAmountMinor: Number(invoice.finalAmountMinor),
        status: String(invoice.status),
        paymentStatus: latestPayment ? String(latestPayment.status) : null,
        issuedAt: invoice.issuedAt ? String(invoice.issuedAt) : null,
        dueAt: invoice.dueAt ? String(invoice.dueAt) : null,
        paidAt: invoice.paidAt ? String(invoice.paidAt) : null,
        createdAt: String(invoice.createdAt),
      });
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findOne(id: string): Promise<AdminInvoiceListItem> {
    const item = (await this.findAll()).find((invoice) => invoice.id === id);
    if (!item) throw new NotFoundException('Invoice tidak ditemukan');
    return item;
  }
}
