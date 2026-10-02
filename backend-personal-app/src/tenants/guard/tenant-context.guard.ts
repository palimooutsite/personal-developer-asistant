import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { TenantService } from '../tenant.service.js';
import type { TenantRequest } from '../types/tenant-request.js';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly tenantService: TenantService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<TenantRequest>();

    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException(
        'User authentication is required',
      );
    }

    const headerTenantId = request.headers['x-tenant-id'];

    if (typeof headerTenantId !== 'string' || !headerTenantId.trim()) {
      throw new ForbiddenException(
        'X-Tenant-Id header is required',
      );
    }

    const tenantId = headerTenantId.trim();
    const routeTenantId = request.params?.tenantId;

    // Billing/resource controllers use :tenantId from the route when calling
    // their services. Never allow the validated header tenant and route tenant
    // to diverge, otherwise a member of tenant A could authenticate the guard
    // with tenant A while the service operates on tenant B.
    if (typeof routeTenantId === 'string' && routeTenantId.trim() !== tenantId) {
      throw new ForbiddenException(
        'Tenant context does not match the requested tenant',
      );
    }

    const membership =
      await this.tenantService.getMembershipForContext(
        tenantId,
        userId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of this tenant',
      );
    }

    request.tenant = {
      tenantId: membership.tenantId,
      role: membership.role as TenantRequest['tenant']['role'],
    };

    return true;
  }
}
