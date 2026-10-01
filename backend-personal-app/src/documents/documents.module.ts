import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { BillingModule } from '../billing/billing.module.js';
import { TenantModule } from '../tenants/tenant.module.js';
import { TenantRoleModule } from '../tenants/roles/tenant-role.module.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    TenantModule,
    TenantRoleModule,
    BillingModule,
  ],
  controllers: [
    DocumentsController,
  ],
  providers: [
    DocumentsService,
    PrismaService,
  ],
})
export class DocumentsModule {}