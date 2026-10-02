import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { PlatformAdminGuard } from '../auth/guard/platform-admin.guard.js';
import { BillingAdminPaymentService, AdminPaymentListItem } from './admin-payment.service.js';

@Controller('billing/admin/payments')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class BillingAdminPaymentController {
  constructor(private readonly paymentService: BillingAdminPaymentService) {}
  @Get()
  findAll():Promise<AdminPaymentListItem[]> { return this.paymentService.findAll(); }
  @Get(':id')
  findOne(@Param('id') id:string):Promise<AdminPaymentListItem> { return this.paymentService.findOne(id); }
}
