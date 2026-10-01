import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillingPaymentService, BillingPaymentResponse } from './payment.service.js';
import { BillingInvoiceService, BillingInvoiceResponse } from './invoice.service.js';
import { BillingSubscriptionService, BillingSubscriptionDetailResponse } from './subscription.service.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';

export interface BillingCheckoutResponse {
  subscription: BillingSubscriptionDetailResponse;
  invoice: BillingInvoiceResponse;
  payment: BillingPaymentResponse;
}

@Injectable()
export class BillingCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: BillingSubscriptionService,
    private readonly invoiceService: BillingInvoiceService,
    private readonly paymentService: BillingPaymentService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    data: CreateCheckoutDto,
  ): Promise<BillingCheckoutResponse> {
    const provider = data.provider ?? 'SANDBOX';

    const subscription = await this.subscriptionService.create(
      tenantId,
      userId,
      {
        packageId: data.packageId,
        packagePriceId: data.packagePriceId,
        provider: provider as any,
      },
    );

    try {
      const invoice = await this.invoiceService.create(
        tenantId,
        userId,
        { discountCode: data.discountCode },
      );

      const payment = await this.paymentService.create(
        tenantId,
        userId,
        invoice.id!,
        provider as any,
      );

      const currentSubscription = await this.subscriptionService.getCurrent(
        tenantId,
        userId,
      );

      if (!currentSubscription) {
        throw new ConflictException('Subscription checkout berhasil dibuat tetapi subscription tidak dapat dibaca');
      }

      return {
        subscription: currentSubscription,
        invoice,
        payment,
      };
    } catch (error) {
      await this.prisma.client.orm.public.TenantSubscription
        .where({ id: subscription.id, tenantId })
        .update({ status: 'CANCELLED', cancelledAt: new Date().toISOString() });
      throw error;
    }
  }
}
