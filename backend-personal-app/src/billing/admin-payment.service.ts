import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AdminPaymentListItem {
  id:string;
  tenantId:string;
  workspaceName:string;
  subscriptionId:string;
  invoiceId:string;
  packageName:string;
  packageCode:string;
  provider:string;
  providerPaymentId:string|null;
  status:string;
  amountMinor:number;
  currency:string;
  checkoutUrl:string|null;
  paidAt:string|null;
  expiresAt:string|null;
  createdAt:string;
}

@Injectable()
export class BillingAdminPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminPaymentListItem[]> {
    const payments = await this.prisma.client.orm.public.Payment.all();
    const result: AdminPaymentListItem[] = [];

    for (const payment of payments) {
      const [tenant, invoice] = await Promise.all([
        this.prisma.client.orm.public.Tenant.where({id:payment.tenantId}).select('id','name').first(),
        this.prisma.client.orm.public.SubscriptionInvoice.where({id:payment.invoiceId}).select('id','packageName','packageCode').first(),
      ]);
      if (!tenant || !invoice) continue;

      result.push({
        id:payment.id, tenantId:payment.tenantId, workspaceName:tenant.name,
        subscriptionId:payment.subscriptionId, invoiceId:payment.invoiceId,
        packageName:invoice.packageName, packageCode:invoice.packageCode,
        provider:String(payment.provider), providerPaymentId:payment.providerPaymentId ?? null,
        status:String(payment.status), amountMinor:Number(payment.amountMinor),
        currency:String(payment.currency), checkoutUrl:payment.checkoutUrl ?? null,
        paidAt:payment.paidAt ? String(payment.paidAt) : null,
        expiresAt:payment.expiresAt ? String(payment.expiresAt) : null,
        createdAt:String(payment.createdAt),
      });
    }
    return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }

  async findOne(id:string): Promise<AdminPaymentListItem> {
    const item=(await this.findAll()).find(payment=>payment.id===id);
    if (!item) throw new NotFoundException('Payment tidak ditemukan');
    return item;
  }
}
