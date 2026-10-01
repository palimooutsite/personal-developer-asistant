import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { PlatformAdminGuard } from '../auth/guard/platform-admin.guard.js';
import { BillingAdminSubscriptionService } from './admin-subscription.service.js';

@Controller('billing/admin/subscriptions')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class BillingAdminSubscriptionController {
  constructor(private readonly service: BillingAdminSubscriptionService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}
