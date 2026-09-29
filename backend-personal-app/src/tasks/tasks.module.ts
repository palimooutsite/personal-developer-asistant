import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantModule } from '../tenants/tenant.module.js';
import { TenantRoleModule } from '../tenants/roles/tenant-role.module.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    TenantModule,
    TenantRoleModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, PrismaService],
})
export class TasksModule {}
