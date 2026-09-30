import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import {
  BillingSubscriptionDetailResponse,
  BillingSubscriptionMessageResponse,
  BillingSubscriptionResponse,
  BillingSubscriptionService,
} from './subscription.service.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';

@Controller('billing/tenants/:tenantId/subscription')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BillingSubscriptionController {
  constructor(
    private readonly subscriptionService: BillingSubscriptionService,
  ) {}

  @Get()
  async getCurrent(
    @Param('tenantId') tenantId: string,
    @Req() req: AuthRequest,
  ): Promise<BillingSubscriptionDetailResponse | null> {
    return this.subscriptionService.getCurrent(tenantId, req.user.userId);
  }

  @Post()
  async create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateSubscriptionDto,
    @Req() req: AuthRequest,
  ): Promise<BillingSubscriptionDetailResponse> {
    return this.subscriptionService.create(
      tenantId,
      req.user.userId,
      body,
    );
  }

  @Patch('cancel')
  async cancel(
    @Param('tenantId') tenantId: string,
    @Req() req: AuthRequest,
  ): Promise<BillingSubscriptionMessageResponse> {
    return this.subscriptionService.cancel(tenantId, req.user.userId);
  }
}
