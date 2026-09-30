import { Module } from '@nestjs/common';

import { BillingCatalogController } from './catalog.controller.js';
import { BillingCatalogService } from './catalog.service.js';
import { BillingDiscountController } from './discount.controller.js';
import { BillingDiscountService } from './discount.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [
    BillingCatalogController,
    BillingDiscountController,
  ],
  providers: [
    BillingCatalogService,
    BillingDiscountService,
  ],
  exports: [
    BillingCatalogService,
    BillingDiscountService,
  ],
})
export class BillingModule {}
