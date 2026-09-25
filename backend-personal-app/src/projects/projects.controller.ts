import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';

import {
  ProjectListItem,
  ProjectMemberListItem,
  ProjectsService,
} from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import {
  AddProjectMemberDto,
  AddProjectMembersDto,
} from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import type { TenantRequest } from '../tenants/types/tenant-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@Req() req: TenantRequest): Promise<ProjectListItem[]> {
    return this.projectsService.findAll(
      req.user.userId,
      req.tenant.tenantId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<ProjectListItem> {
    return this.projectsService.findOne(
      id,
      req.user.userId,
      req.tenant.tenantId,
    );
  }

  @Post()
  async create(
    @Body() body: CreateProjectDto,
    @Req() req: TenantRequest,
  ) {
    return this.projectsService.create(
      body,
      req.user.userId,
      req.tenant.tenantId,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
    @Req() req: TenantRequest,
  ): Promise<ProjectListItem> {
    return this.projectsService.update(
      id,
      req.user.userId,
      req.tenant.tenantId,
      body,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.projectsService.remove(
      id,
      req.user.userId,
      req.tenant.tenantId,
    );
  }

  @Get(':id/members')
  async findMembers(
    @Param('id') id: string,
    @Req() req: TenantRequest,
  ): Promise<ProjectMemberListItem[]> {
    return this.projectsService.findMembers(
      id,
      req.user.userId,
      req.tenant.tenantId,
    );
  }

  @Patch(':id/members/:userId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateProjectMemberDto,
    @Req() req: TenantRequest,
  ): Promise<ProjectMemberListItem> {
    return this.projectsService.updateMemberRole(
      id,
      req.user.userId,
      userId,
      req.tenant.tenantId,
      body,
    );
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.projectsService.removeMember(
      id,
      req.user.userId,
      userId,
      req.tenant.tenantId,
    );
  }

  @Post(':id/members/bulk')
  async addMembers(
    @Param('id') id: string,
    @Body() body: AddProjectMembersDto,
    @Req() req: TenantRequest,
  ): Promise<ProjectMemberListItem[]> {
    return this.projectsService.addMembers(
      id,
      req.user.userId,
      body.members,
      req.tenant.tenantId,
    );
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: AddProjectMemberDto,
    @Req() req: TenantRequest,
  ) {
    return this.projectsService.addMember(
      id,
      req.user.userId,
      body,
      req.tenant.tenantId,
    );
  }
}
