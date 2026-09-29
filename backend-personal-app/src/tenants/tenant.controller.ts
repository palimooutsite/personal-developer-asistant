import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Delete,
  UseGuards,
} from '@nestjs/common';

import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from './guard/tenant-context.guard.js';

import {
  TenantListItem,
  TenantMemberListItem,
  TenantResponse,
  TenantService,
  
} from './tenant.service.js';

import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { AddTenantMemberDto } from './dto/add-tenant-member.dto.js';
import { UpdateTenantMemberDto } from './dto/update-tenant-member.dto.js';
import { CreateTenantInvitationDto } from './dto/create-tenant-invitation.dto.js';

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

  @Get(':id/permissions')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  async getPermissions(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    return this.tenantService.getPermissions(id, req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
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
  @Get(':id/members')
async findMembers(
  @Param('id') id: string,
  @Req() req: AuthRequest,
): Promise<TenantMemberListItem[]> {
  return this.tenantService.findMembers(
    id,
    req.user.userId,
  );
}

@Post(':id/invitations')
async createInvitation(
  @Param('id') id: string,
  @Body() body: CreateTenantInvitationDto,
  @Req() req: AuthRequest,
): Promise<{ message: string; email: string; role: string }> {
  return this.tenantService.createInvitation(
    id,
    req.user.userId,
    body,
  );
}

@Post(':id/members')
async addMember(
  @Param('id') id: string,
  @Body() body: AddTenantMemberDto,
  @Req() req: AuthRequest,
): Promise<TenantMemberListItem> {
  return this.tenantService.addMember(
    id,
    req.user.userId,
    body,
  );
}

@Patch(':id/members/:userId')
async updateMemberRole(
  @Param('id') id: string,
  @Param('userId') userId: string,
  @Body() body: UpdateTenantMemberDto,
  @Req() req: AuthRequest,
): Promise<TenantMemberListItem> {
  return this.tenantService.updateMemberRole(
    id,
    req.user.userId,
    userId,
    body,
  );
}

@Post('/invitations/accept')
async acceptInvitation(
  @Body() body: { token: string },
  @Req() req: AuthRequest,
): Promise<{ message: string; tenantId: string; role: string }> {
  return this.tenantService.acceptInvitation(
    body.token,
    req.user.userId,
  );
}

@Delete(':id/members/:userId')
async removeMember(
  @Param('id') id: string,
  @Param('userId') userId: string,
  @Req() req: AuthRequest,
): Promise<{ message: string }> {
  return this.tenantService.removeMember(
    id,
    req.user.userId,
    userId,
  );
}
}