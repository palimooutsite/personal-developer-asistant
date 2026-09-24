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

import {
  TenantListItem,
  TenantResponse,
  TenantService,
} from './tenant.service.js';

import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
  ) {}

  @Get()
  async findAll(
    @Req() req: AuthRequest,
  ): Promise<TenantListItem[]> {
    return this.tenantService.findAll(
      req.user.userId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<TenantResponse> {
    return this.tenantService.findOne(
      id,
      req.user.userId,
    );
  }

  @Post()
  async create(
    @Body() body: CreateTenantDto,
    @Req() req: AuthRequest,
  ): Promise<TenantResponse> {
    return this.tenantService.create(
      body,
      req.user.userId,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateTenantDto,
    @Req() req: AuthRequest,
  ): Promise<TenantResponse> {
    return this.tenantService.update(
      id,
      req.user.userId,
      body,
    );
  }
}