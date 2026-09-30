import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import { BillingPaymentService, BillingPaymentResponse } from './payment.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

@Controller('billing/tenants/:tenantId')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BillingPaymentController {
  constructor(private readonly paymentService: BillingPaymentService) {}

  @Get('payments')
  list(@Param('tenantId') tenantId: string, @Req() req: AuthRequest): Promise<BillingPaymentResponse[]> {
    return this.paymentService.list(tenantId, req.user.userId);
  }

  @Get('payments/:paymentId')
  findOne(@Param('tenantId') tenantId: string, @Param('paymentId') paymentId: string, @Req() req: AuthRequest): Promise<BillingPaymentResponse> {
    return this.paymentService.findOne(tenantId, req.user.userId, paymentId);
  }

  @Post('invoices/:invoiceId/payment')
  create(@Param('tenantId') tenantId: string, @Param('invoiceId') invoiceId: string, @Body() body: CreatePaymentDto, @Req() req: AuthRequest): Promise<BillingPaymentResponse> {
    return this.paymentService.create(tenantId, req.user.userId, invoiceId, body.provider);
  }

  @Post('payments/:paymentId/sandbox/succeed')
  sandboxSucceed(@Param('tenantId') tenantId: string, @Param('paymentId') paymentId: string, @Req() req: AuthRequest): Promise<BillingPaymentResponse> {
    return this.paymentService.sandboxSucceed(tenantId, req.user.userId, paymentId);
  }

  @Post('payments/:paymentId/sandbox/fail')
  sandboxFail(@Param('tenantId') tenantId: string, @Param('paymentId') paymentId: string, @Req() req: AuthRequest): Promise<BillingPaymentResponse> {
    return this.paymentService.sandboxFail(tenantId, req.user.userId, paymentId);
  }
}
