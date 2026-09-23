import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService, DashboardResponse } from './dashboard.service.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Req() req: AuthRequest): Promise<DashboardResponse> {
    return this.dashboardService.getSummary(req.user.userId);
  }
}
