import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AddTaskAssigneeDto } from './dto/add-task-assignee.dto.js';
import { BillingFeatureService } from '../billing/feature.service.js';

type TaskMutationRole = 'OWNER' | 'ADMIN' | 'DEVELOPER';

export interface TaskAssigneeResponse {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  username: string | null;
  email: string | null;
  name: string | null;
  createdAt: string;
}

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

export interface TaskListResponse extends TaskResponse {
  assignees: TaskAssigneeSummary[];
}

export interface TaskPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskPaginatedResponse {
  data: TaskListResponse[];
  meta: TaskPaginationMeta;
}

export interface TaskAssigneeSummary {
  userId: string;
  username: string | null;
  name: string | null;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingFeatureService: BillingFeatureService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    tenantId: string,
    data: CreateTaskDto,
  ): Promise<TaskResponse> {
    await this.requireMutationAccess(projectId, userId, tenantId);

    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId, tenantId })
      .select('id')
      .first();

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const currentTaskUsage = (
      await this.prisma.client.orm.public.Task
        .where({ tenantId })
        .select('id')
        .all()
    ).length;

    await this.billingFeatureService.assertWithinLimit(
      tenantId,
      userId,
      'TASK',
      currentTaskUsage,
    );

    const task = await this.prisma.client.orm.public.Task.create({
      projectId,
      tenantId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? 'MEDIUM',
      dueDate: data.dueDate,
    });

    return this.toTaskResponse(task);
  }

  async findAll(
    projectId: string,
    userId: string,
    tenantId: string,
    page = 1,
    limit = 10,
    all = false,
  ): Promise<TaskPaginatedResponse | TaskListResponse[]> {
    await this.requireProjectMembership(projectId, userId, tenantId);

    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId, tenantId })
      .select('id')
      .first();

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const tasks = await this.prisma.client.orm.public.Task
      .where({ projectId, tenantId })
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

    const result: TaskListResponse[] = [];

    for (const task of tasks) {
      const assignees = await this.prisma.client.orm.public.TaskAssignee
        .where({ taskId: task.id, projectId })
        .select('userId')
        .all();

      const assigneeResult: TaskAssigneeSummary[] = [];

      for (const assignee of assignees) {
        const user = await this.prisma.client.orm.public.User
          .where({ id: assignee.userId })
          .select('id', 'username', 'name')
          .first();

        assigneeResult.push({
          userId: assignee.userId,
          username: user?.username ?? null,
          name: user?.name ?? null,
        });
      }

      result.push({
        ...this.toTaskResponse(task),
        assignees: assigneeResult,
      });
    }

    if (all) {
      return result;
    }

    const normalizedLimit = Math.min(50, Math.max(1, limit));
    const total = result.length;
    const totalPages = Math.ceil(total / normalizedLimit);
    const safePage = totalPages > 0
      ? Math.min(Math.max(1, page), totalPages)
      : 1;
    const start = (safePage - 1) * normalizedLimit;

    return {
      data: result.slice(start, start + normalizedLimit),
      meta: {
        page: safePage,
        limit: normalizedLimit,
        total,
        totalPages,
      },
    };
  }

  async findOne(
    projectId: string,
    taskId: string,
    userId: string,
    tenantId: string,
  ): Promise<TaskResponse> {
    await this.requireProjectMembership(projectId, userId, tenantId);

    const task = await this.findTask(projectId, taskId, tenantId);

    return this.toTaskResponse(task);
  }

  async update(
    projectId: string,
    taskId: string,
    userId: string,
    tenantId: string,
    data: UpdateTaskDto,
  ): Promise<TaskResponse> {
    await this.requireMutationAccess(projectId, userId, tenantId);

    await this.findTask(projectId, taskId, tenantId);

    const updateData: {
      title?: string;
      description?: string | null;
      status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: string | null;
    } = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

    const updatedTask = await this.prisma.client.orm.public.Task
      .where({ id: taskId, projectId, tenantId })
      .update(updateData);

    if (!updatedTask) {
      throw new NotFoundException('Task tidak ditemukan pada project ini');
    }

    return this.toTaskResponse(updatedTask);
  }

  async addAssignee(
    projectId: string,
    taskId: string,
    userId: string,
    tenantId: string,
    data: AddTaskAssigneeDto,
  ): Promise<{ taskId: string; userId: string }> {
    await this.requireMutationAccess(projectId, userId, tenantId);
    await this.findTask(projectId, taskId, tenantId);

    const assigneeMember = await this.prisma.client.orm.public.ProjectMember
      .where({
        projectId,
        userId: data.userId,
      })
      .select('projectId', 'userId')
      .first();

    if (!assigneeMember) {
      throw new NotFoundException('User bukan member project ini');
    }

    const existing = await this.prisma.client.orm.public.TaskAssignee
      .where({
        taskId,
        projectId,
        userId: data.userId,
      })
      .select('id')
      .first();

    if (existing) {
      throw new ForbiddenException('User sudah menjadi assignee task ini');
    }

    const assignee = await this.prisma.client.orm.public.TaskAssignee.create({
      taskId,
      projectId,
      userId: data.userId,
    });

    return {
      taskId: assignee.taskId,
      userId: assignee.userId,
    };
  }

  async findAssignees(
    projectId: string,
    taskId: string,
    userId: string,
    tenantId: string,
  ): Promise<TaskAssigneeResponse[]> {
    await this.requireProjectMembership(projectId, userId, tenantId);
    await this.findTask(projectId, taskId, tenantId);

    const assignees = await this.prisma.client.orm.public.TaskAssignee
      .where({ taskId, projectId })
      .select('id', 'taskId', 'projectId', 'userId', 'createdAt')
      .all();

    const result: TaskAssigneeResponse[] = [];

    for (const assignee of assignees) {
      const user = await this.prisma.client.orm.public.User
        .where({ id: assignee.userId })
        .select('id', 'username', 'email', 'name')
        .first();

      result.push({
        id: assignee.id,
        taskId: assignee.taskId,
        projectId: assignee.projectId,
        userId: assignee.userId,
        username: user?.username ?? null,
        email: user?.email ?? null,
        name: user?.name ?? null,
        createdAt: assignee.createdAt,
      });
    }

    return result;
  }

  async removeAssignee(
    projectId: string,
    taskId: string,
    assigneeUserId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    await this.requireMutationAccess(projectId, userId, tenantId);
    await this.findTask(projectId, taskId, tenantId);

    const assignee = await this.prisma.client.orm.public.TaskAssignee
      .where({
        taskId,
        projectId,
        userId: assigneeUserId,
      })
      .select('id')
      .first();

    if (!assignee) {
      throw new NotFoundException('Assignee tidak ditemukan pada task ini');
    }

    await this.prisma.client.orm.public.TaskAssignee
      .where({
        taskId,
        projectId,
        userId: assigneeUserId,
      })
      .delete();

    return {
      message: 'Assignee task berhasil dihapus',
    };
  }

  async remove(
    projectId: string,
    taskId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    await this.requireMutationAccess(projectId, userId, tenantId);
    await this.findTask(projectId, taskId, tenantId);

    await this.prisma.client.orm.public.Task
      .where({ id: taskId, projectId, tenantId })
      .delete();

    return { message: 'Task berhasil dihapus' };
  }

  private async requireProjectMembership(
    projectId: string,
    userId: string,
    tenantId: string,
  ) {
    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId, tenantId })
      .select('id')
      .first();

    if (!project) {
      throw new ForbiddenException('Project bukan bagian dari workspace aktif');
    }

    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId })
      .select('projectId', 'userId', 'role')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    return membership;
  }

  private async requireMutationAccess(
    projectId: string,
    userId: string,
    tenantId: string,
  ) {
    const membership = await this.requireProjectMembership(projectId, userId, tenantId);

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN' &&
      membership.role !== 'DEVELOPER'
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah task',
      );
    }

    return membership as typeof membership & { role: TaskMutationRole };
  }

  private async findTask(projectId: string, taskId: string, tenantId: string) {
    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId, tenantId })
      .select('id')
      .first();

    if (!project) {
      throw new ForbiddenException('Project bukan bagian dari workspace aktif');
    }

    const task = await this.prisma.client.orm.public.Task
      .where({
        id: taskId,
        projectId,
        tenantId,
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
      throw new NotFoundException('Task tidak ditemukan pada project ini');
    }

    return task;
  }

  private toTaskResponse(task: {
    id: string;
    projectId: string;
    createdBy: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
  }): TaskResponse {
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
