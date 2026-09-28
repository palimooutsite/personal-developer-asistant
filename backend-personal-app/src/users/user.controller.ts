import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import type { TenantRequest } from '../tenants/types/tenant-request.js';
import { UsersService } from './user.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('search')
  async search(
    @Query('search') search: string | undefined,
    @Query('page') page = '1',
    @Query('limit') limit = '5',
    @Query('excludeUserIds') excludeUserIds = '',
    @Req() req: TenantRequest,
  ) {
    return this.usersService.searchUsers(
      req.tenant.tenantId,
      req.user.userId,
      search,
      Number(page),
      Number(limit),
      excludeUserIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
  }
}
