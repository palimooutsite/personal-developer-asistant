import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { PlatformAdminGuard } from '../auth/guard/platform-admin.guard.js';
import { BillingAdminInvoiceService, AdminInvoiceListItem } from './admin-invoice.service.js';

@Controller('billing/admin/invoices')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class BillingAdminInvoiceController {
  constructor(private readonly invoiceService: BillingAdminInvoiceService) {}

  @Get()
  findAll(): Promise<AdminInvoiceListItem[]> {
    return this.invoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<AdminInvoiceListItem> {
    return this.invoiceService.findOne(id);
  }
}
