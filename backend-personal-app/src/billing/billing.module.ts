import { Module } from '@nestjs/common';
import { BillingCatalogController } from './catalog.controller.js';
import { BillingCatalogService } from './catalog.service.js';

@Module({
  controllers: [BillingCatalogController],
  providers: [BillingCatalogService],
  exports: [BillingCatalogService],
})
export class BillingModule {}
