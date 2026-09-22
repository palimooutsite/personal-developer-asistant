import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TasksService, TaskResponse } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
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
