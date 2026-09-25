import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Patch,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';

import { TasksService, TaskResponse, TaskListResponse, TaskAssigneeResponse } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AddTaskAssigneeDto } from './dto/add-task-assignee.dto.js';
import type { TenantRequest } from '../tenants/types/tenant-request.js';
import { TenantContextGuard } from '../tenants/guard/tenant-context.guard.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() body: CreateTaskDto,
    @Req() req: TenantRequest,
  ): Promise<TaskResponse> {
    return this.tasksService.create(
      projectId,
      req.user.userId,
      req.tenant.tenantId,
      body,
    );
  }

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('all') all = 'false',
    @Req() req: TenantRequest,
  ): Promise<TaskListResponse[] | import('./tasks.service.js').TaskPaginatedResponse> {
    return this.tasksService.findAll(
      projectId,
      req.user.userId,
      req.tenant.tenantId,
      Number(page),
      Number(limit),
      all === 'true',
    );
  }



  @Post(':taskId/assignees')
  async addAssignee(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: AddTaskAssigneeDto,
    @Req() req: TenantRequest,
  ): Promise<{ taskId: string; userId: string }> {
    return this.tasksService.addAssignee(
      projectId,
      taskId,
      req.user.userId,
      body,
    );
  }

  @Patch(':taskId')
  async update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskDto,
    @Req() req: TenantRequest,
  ): Promise<TaskResponse> {
    return this.tasksService.update(
      projectId,
      taskId,
      req.user.userId,
      body,
    );
  }


  @Get(':taskId/assignees')
  async findAssignees(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: TenantRequest,
  ): Promise<TaskAssigneeResponse[]> {
    return this.tasksService.findAssignees(
      projectId,
      taskId,
      req.user.userId,
      req.tenant.tenantId,
    );
  }


  @Delete(':taskId/assignees/:assigneeUserId')
  async removeAssignee(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('assigneeUserId') assigneeUserId: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.tasksService.removeAssignee(
      projectId,
      taskId,
      assigneeUserId,
      req.user.userId,
    );
  }

  @Delete(':taskId')
  async remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: TenantRequest,
  ): Promise<{ message: string }> {
    return this.tasksService.remove(
      projectId,
      taskId,
      req.user.userId,
    );
  }

  @Get(':taskId')
  async findOne(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: TenantRequest,
  ): Promise<TaskResponse> {
    return this.tasksService.findOne(
      projectId,
      taskId,
      req.user.userId,
    );
  }
}
