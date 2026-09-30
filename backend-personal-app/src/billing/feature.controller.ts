import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import { BillingFeatureService, BillingFeatureAccess } from './feature.service.js';

@Controller('billing/tenants/:tenantId/features')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BillingFeatureController {
  constructor(private readonly featureService: BillingFeatureService) {}

  @Get(':code')
  check(
    @Param('tenantId') tenantId: string,
    @Param('code') code: string,
    @Query('currentUsage') currentUsage: string | undefined,
    @Req() req: AuthRequest,
  ): Promise<BillingFeatureAccess> {
    return this.featureService.check(
      tenantId,
      req.user.userId,
      code,
      currentUsage === undefined ? 0 : Number(currentUsage),
    );
  }
}
