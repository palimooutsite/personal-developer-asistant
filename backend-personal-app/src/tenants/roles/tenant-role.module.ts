import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant.module.js';
import { TenantRoleController } from './tenant-role.controller.js';
import { TenantRoleService } from './tenant-role.service.js';
import { PermissionGuard } from './permission.guard.js';

@Module({
  imports: [TenantModule],
  controllers: [TenantRoleController],
  providers: [TenantRoleService, PermissionGuard],
  exports: [TenantRoleService, PermissionGuard],
})
export class TenantRoleModule {}
