import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { PrismaService } from '../prisma/prisma.service.js';

import { TenantController } from './tenant.controller.js';
import { TenantService } from './tenant.service.js';
import { TenantContextGuard } from './guard/tenant-context.guard.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    AuditModule,
  ],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantContextGuard,
    PrismaService,
  ],
  exports: [TenantService, TenantContextGuard],
})
export class TenantModule {}