import { Module } from '@nestjs/common';

import { BillingCatalogController } from './catalog.controller.js';
import { BillingCatalogService } from './catalog.service.js';
import { BillingDiscountController } from './discount.controller.js';
import { BillingDiscountService } from './discount.service.js';
import { BillingSubscriptionController } from './subscription.controller.js';
import { BillingSubscriptionService } from './subscription.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [
    BillingCatalogController,
    BillingDiscountController,
    BillingSubscriptionController,
  ],
  providers: [
    BillingCatalogService,
    BillingDiscountService,
    BillingSubscriptionService,
  ],
  exports: [
    BillingCatalogService,
    BillingDiscountService,
    BillingSubscriptionService,
  ],
})
export class BillingModule {}
