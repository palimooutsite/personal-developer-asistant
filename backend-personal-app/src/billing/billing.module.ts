import { Module } from '@nestjs/common';

import { BillingCatalogController } from './catalog.controller.js';
import { BillingCatalogService } from './catalog.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [
    BillingCatalogController,
  ],
  providers: [
    BillingCatalogService,
  ],
  exports: [
    BillingCatalogService,
  ],
})
export class BillingModule {}
