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
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}
  @Get()
  async findAll(@Req() req: AuthRequest): Promise<ProjectListItem[]> {
    return this.projectsService.findAll(req.user.userId);
  }
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<ProjectListItem> {
    return this.projectsService.findOne(id, req.user.userId);
  }
  @Post()
  async create(@Body() body: CreateProjectDto, @Req() req: AuthRequest) {
    return this.projectsService.create(body, req.user.userId);
  }
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
    @Req() req: AuthRequest,
  ): Promise<ProjectListItem> {
    return this.projectsService.update(id, req.user.userId, body);
  }
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<{ message: string }> {
    return this.projectsService.remove(id, req.user.userId);
  }
  @Get(':id/members')
  async findMembers(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<ProjectMemberListItem[]> {
    return this.projectsService.findMembers(id, req.user.userId);
  }
  @Post(':id/members')
async addMember(
  @Param('id') id: string,
  @Body() body: AddProjectMemberDto,
  @Req() req: AuthRequest,
) {
  return this.projectsService.addMember(
    id,
    req.user.userId,
    body,
  );
}
}
