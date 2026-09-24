import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { PrismaService } from '../prisma/prisma.service.js';

import { TenantController } from './tenant.controller.js';
import { TenantService } from './tenant.service.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [TenantController],
  providers: [
    TenantService,
    PrismaService,
  ],
  exports: [TenantService],
})
export class TenantModule {}