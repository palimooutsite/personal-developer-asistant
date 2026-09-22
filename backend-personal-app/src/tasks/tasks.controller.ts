import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { TasksService, TaskResponse } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
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
}
