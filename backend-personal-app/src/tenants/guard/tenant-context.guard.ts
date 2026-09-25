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

    const tenantId = request.headers['x-tenant-id'];

    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new ForbiddenException(
        'X-Tenant-Id header is required',
      );
    }

    const membership =
      await this.tenantService.getMembershipForContext(
        tenantId.trim(),
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
