import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../guard/tenant-context.guard.js';
import { TenantRoleService, CreateTenantRoleInput } from './tenant-role.service.js';
import { PermissionGuard } from './permission.guard.js';
import { RequirePermission } from './require-permission.decorator.js';
import type { TenantRequest } from '../types/tenant-request.js';

@Controller('tenants/:tenantId/roles')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionGuard)
export class TenantRoleController {
  constructor(private readonly roleService: TenantRoleService) {}

  @Get()
  @RequirePermission('WORKSPACE_SETTINGS', 'READ')
  list(@Param('tenantId') tenantId: string) {
    return this.roleService.list(tenantId);
  }

  @Post()
  @RequirePermission('WORKSPACE_SETTINGS', 'CREATE')
  create(@Param('tenantId') tenantId: string, @Body() body: CreateTenantRoleInput) {
    return this.roleService.create(tenantId, body);
  }

  @Get(':roleId')
  @RequirePermission('WORKSPACE_SETTINGS', 'READ')
  findOne(@Param('tenantId') tenantId: string, @Param('roleId') roleId: string) {
    return this.roleService.findOne(tenantId, roleId);
  }

  @Patch(':roleId')
  @RequirePermission('WORKSPACE_SETTINGS', 'UPDATE')
  update(@Param('tenantId') tenantId: string, @Param('roleId') roleId: string, @Body() body: CreateTenantRoleInput) {
    return this.roleService.update(tenantId, roleId, body);
  }

  @Delete(':roleId')
  @RequirePermission('WORKSPACE_SETTINGS', 'DELETE')
  remove(@Param('tenantId') tenantId: string, @Param('roleId') roleId: string) {
    return this.roleService.remove(tenantId, roleId);
  }
}
