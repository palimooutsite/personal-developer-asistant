import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';

export interface TaskResponse {
  id: string;
  projectId: string;
  createdBy: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    projectId: string,
    userId: string,
    data: CreateTaskDto,
  ): Promise<TaskResponse> {
    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({
        projectId,
        userId,
      })
      .select('projectId', 'userId', 'role')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN' &&
      membership.role !== 'DEVELOPER'
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk membuat task',
      );
    }

    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId })
      .select('id')
      .first();

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const task = await this.prisma.client.orm.public.Task.create({
      projectId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? 'MEDIUM',
      dueDate: data.dueDate,
    });

    return {
      id: task.id,
      projectId: task.projectId,
      createdBy: task.createdBy,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    };
  }

  async findAll(
    projectId: string,
    userId: string,
  ): Promise<TaskResponse[]> {
    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({
        projectId,
        userId,
      })
      .select('projectId', 'userId', 'role')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId })
      .select('id')
      .first();

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const tasks = await this.prisma.client.orm.public.Task
      .where({ projectId })
      .select(
        'id',
        'projectId',
        'createdBy',
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
      )
      .all();

    return tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      createdBy: task.createdBy,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    }));
  }

  async findOne(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskResponse> {
    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({
        projectId,
        userId,
      })
      .select('projectId', 'userId', 'role')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    const task = await this.prisma.client.orm.public.Task
      .where({
        id: taskId,
        projectId,
      })
      .select(
        'id',
        'projectId',
        'createdBy',
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
      )
      .first();

    if (!task) {
      throw new NotFoundException(
        'Task tidak ditemukan pada project ini',
      );
    }

    return {
      id: task.id,
      projectId: task.projectId,
      createdBy: task.createdBy,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
    };
  }
}
