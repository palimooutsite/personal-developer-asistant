import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import { BillingInvoiceService, BillingInvoiceResponse } from './invoice.service.js';
import { CreateInvoiceDto, PreviewInvoiceDto } from './dto/preview-invoice.dto.js';

@Controller('billing/tenants/:tenantId/invoices')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BillingInvoiceController {
  constructor(private readonly invoiceService: BillingInvoiceService) {}

  @Get()
  list(
    @Param('tenantId') tenantId: string,
    @Req() req: AuthRequest,
  ): Promise<BillingInvoiceResponse[]> {
    return this.invoiceService.list(tenantId, req.user.userId);
  }

  @Get(':invoiceId')
  findOne(
    @Param('tenantId') tenantId: string,
    @Param('invoiceId') invoiceId: string,
    @Req() req: AuthRequest,
  ): Promise<BillingInvoiceResponse> {
    return this.invoiceService.findOne(tenantId, req.user.userId, invoiceId);
  }

  @Post('preview')
  preview(
    @Param('tenantId') tenantId: string,
    @Body() body: PreviewInvoiceDto,
    @Req() req: AuthRequest,
  ): Promise<BillingInvoiceResponse> {
    return this.invoiceService.preview(tenantId, req.user.userId, body);
  }

  @Post()
  create(
    @Param('tenantId') tenantId: string,
    @Body() body: CreateInvoiceDto,
    @Req() req: AuthRequest,
  ): Promise<BillingInvoiceResponse> {
    return this.invoiceService.create(tenantId, req.user.userId, body);
  }
}
