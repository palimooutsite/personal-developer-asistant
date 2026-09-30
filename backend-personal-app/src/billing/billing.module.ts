import { Module } from '@nestjs/common';

import { BillingCatalogController } from './catalog.controller.js';
import { BillingCatalogService } from './catalog.service.js';
import { BillingDiscountController } from './discount.controller.js';
import { BillingDiscountService } from './discount.service.js';
import { BillingSubscriptionController } from './subscription.controller.js';
import { BillingSubscriptionService } from './subscription.service.js';
import { BillingInvoiceController } from './invoice.controller.js';
import { BillingInvoiceService } from './invoice.service.js';
import { BillingPaymentController } from './payment.controller.js';
import { BillingPaymentService } from './payment.service.js';
import { BillingFeatureController } from './feature.controller.js';
import { BillingFeatureService } from './feature.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { TenantModule } from '../tenants/tenant.module.js';

@Module({
  imports: [AuthModule, TenantModule],
  controllers: [
    BillingCatalogController,
    BillingDiscountController,
    BillingSubscriptionController,
    BillingInvoiceController,
    BillingPaymentController,
    BillingFeatureController,
  ],
  providers: [
    BillingCatalogService,
    BillingDiscountService,
    BillingSubscriptionService,
    BillingInvoiceService,
    BillingPaymentService,
    BillingFeatureService,
  ],
  exports: [
    BillingCatalogService,
    BillingDiscountService,
    BillingSubscriptionService,
    BillingInvoiceService,
    BillingPaymentService,
    BillingFeatureService,
  ],
})
export class BillingModule {}
