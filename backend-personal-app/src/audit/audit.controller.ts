import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { PlatformAdminGuard } from '../auth/guard/platform-admin.guard.js';
import { AuditService } from './audit.service.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('action') action?: string, @Query('entity') entity?: string, @Query('tenantId') tenantId?: string, @Query('userId') userId?: string) {
    return this.auditService.findAll({ q, action, entity, tenantId, userId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
