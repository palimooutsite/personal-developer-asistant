import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './require-permission.decorator.js';
import type { PermissionAction, PermissionModule } from './permission.constants.js';
import { TenantRoleService } from './tenant-role.service.js';
import type { TenantRequest } from '../types/tenant-request.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: TenantRoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{
      module: PermissionModule;
      action: PermissionAction;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const allowed = await this.roleService.hasPermission(
      request.tenant.tenantId,
      request.user.userId,
      required.module,
      required.action,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Anda tidak memiliki izin ${required.action} pada modul ${required.module}`,
      );
    }
    return true;
  }
}
