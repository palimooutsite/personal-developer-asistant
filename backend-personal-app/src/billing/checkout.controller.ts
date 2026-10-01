import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import { BillingCheckoutService, BillingCheckoutResponse } from './checkout.service.js';
import { CreateCheckoutDto } from './dto/create-checkout.dto.js';

@Controller('billing/tenants/:tenantId/checkout')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BillingCheckoutController {
  constructor(private readonly checkoutService: BillingCheckoutService) {}

  @Post()
  create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateCheckoutDto,
    @Req() req: AuthRequest,
  ): Promise<BillingCheckoutResponse> {
    return this.checkoutService.create(tenantId, req.user.userId, body);
  }
}
