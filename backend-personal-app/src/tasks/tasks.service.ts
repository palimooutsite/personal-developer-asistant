import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AddTaskAssigneeDto } from './dto/add-task-assignee.dto.js';

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

  async update(
    projectId: string,
    taskId: string,
    userId: string,
    data: UpdateTaskDto,
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
        'Anda tidak memiliki izin untuk mengubah task',
      );
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

    const updateData: {
      title?: string;
      description?: string | null;
      status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: string | null;
    } = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;

    const updatedTask = await this.prisma.client.orm.public.Task
      .where({
        id: taskId,
        projectId,
      })
      .update(updateData);

    if (!updatedTask) {
      throw new NotFoundException(
        'Task tidak ditemukan pada project ini',
      );
    }

    return {
      id: updatedTask.id,
      projectId: updatedTask.projectId,
      createdBy: updatedTask.createdBy,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate,
    };
  }
  async addAssignee(
    projectId: string,
    taskId: string,
    userId: string,
    data: AddTaskAssigneeDto,
  ): Promise<{ taskId: string; userId: string }> {
    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId })
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
        'Anda tidak memiliki izin untuk mengatur assignee task',
      );
    }

    const task = await this.prisma.client.orm.public.Task
      .where({ id: taskId, projectId })
      .select('id', 'projectId')
      .first();

    if (!task) {
      throw new NotFoundException(
        'Task tidak ditemukan pada project ini',
      );
    }

    const assigneeMember = await this.prisma.client.orm.public.ProjectMember
      .where({
        projectId,
        userId: data.userId,
      })
      .select('projectId', 'userId')
      .first();

    if (!assigneeMember) {
      throw new NotFoundException(
        'User bukan member project ini',
      );
    }

    const existing = await this.prisma.client.orm.public.TaskAssignee
      .where({
        taskId,
        userId: data.userId,
      })
      .select('id')
      .first();

    if (existing) {
      throw new ForbiddenException(
        'User sudah menjadi assignee task ini',
      );
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
  ): Promise<TaskAssigneeResponse[]> {
    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId })
      .select('projectId', 'userId')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    const task = await this.prisma.client.orm.public.Task
      .where({ id: taskId, projectId })
      .select('id', 'projectId')
      .first();

    if (!task) {
      throw new NotFoundException(
        'Task tidak ditemukan pada project ini',
      );
    }

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

  async remove(
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const membership = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId })
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
        'Anda tidak memiliki izin untuk menghapus task',
      );
    }

    const task = await this.prisma.client.orm.public.Task
      .where({ id: taskId, projectId })
      .select('id')
      .first();

    if (!task) {
      throw new NotFoundException(
        'Task tidak ditemukan pada project ini',
      );
    }

    await this.prisma.client.orm.public.Task
      .where({ id: taskId, projectId })
      .delete();

    return { message: 'Task berhasil dihapus' };
  }

}
