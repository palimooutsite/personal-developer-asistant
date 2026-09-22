import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TasksService, TaskResponse, TaskAssigneeResponse } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AddTaskAssigneeDto } from './dto/add-task-assignee.dto.js';
import type { AuthRequest } from '../auth/types/auth-request.js';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() body: CreateTaskDto,
    @Req() req: AuthRequest,
  ): Promise<TaskResponse> {
    return this.tasksService.create(
      projectId,
      req.user.userId,
      body,
    );
  }

  @Get()
  async findAll(
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ): Promise<TaskResponse[]> {
    return this.tasksService.findAll(
      projectId,
      req.user.userId,
    );
  }



  @Post(':taskId/assignees')
  async addAssignee(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: AddTaskAssigneeDto,
    @Req() req: AuthRequest,
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
    @Req() req: AuthRequest,
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
    @Req() req: AuthRequest,
  ): Promise<TaskAssigneeResponse[]> {
    return this.tasksService.findAssignees(
      projectId,
      taskId,
      req.user.userId,
    );
  }

  @Delete(':taskId')
  async remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: AuthRequest,
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
    @Req() req: AuthRequest,
  ): Promise<TaskResponse> {
    return this.tasksService.findOne(
      projectId,
      taskId,
      req.user.userId,
    );
  }
}
