import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardResponse } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import type { TenantRequest } from '../tenants/types/tenant-request.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req: TenantRequest): Promise<DashboardResponse> {
    return this.dashboardService.getSummary(
      req.user.userId,
      req.tenant.tenantId,
    );
  }
}
