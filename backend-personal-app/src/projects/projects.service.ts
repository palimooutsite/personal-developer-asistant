import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string;
  owner: {
    userId: string;
    role: string;
  };
}
export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string;
  role: string;
}
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateProjectDto,
    userId: string,
  ): Promise<ProjectResponse> {
    return this.prisma.client.transaction(async (tx) => {
      const project = await tx.orm.public.Project.create({
        name: data.name,
        description: data.description,
        createdBy: userId,
      });

      await tx.orm.public.ProjectMember.create({
        projectId: project.id,
        userId,
        role: 'OWNER',
      });

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdBy: project.createdBy,
        owner: {
          userId,
          role: 'OWNER',
        },
      };
    });
  }

  async update(
    projectId: string,
    userId: string,
    data: UpdateProjectDto,
  ): Promise<ProjectListItem> {
    const membership = await this.getMembership(projectId, userId);

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah project ini',
      );
    }

    const updateData: {
      name?: string;
      description?: string;
      status?: UpdateProjectDto['status'];
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    const updated = await this.prisma.client.orm.public.Project.where({
      id: projectId,
    }).update(updateData);

    if (!updated) {
      throw new NotFoundException(
        'Project tidak ditemukan atau gagal diperbarui',
      );
    }

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      createdBy: updated.createdBy,
      role: membership.role,
    };
  }
  async remove(
    projectId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const membership = await this.getMembership(projectId, userId);

    if (membership.role !== 'OWNER') {
      throw new ForbiddenException('Hanya OWNER yang dapat menghapus project');
    }

    return this.prisma.client.transaction(async (tx) => {
      const project = await tx.orm.public.Project.where({
        id: projectId,
      }).first();

      if (!project) {
        throw new NotFoundException('Project tidak ditemukan');
      }

      await tx.orm.public.ProjectMember.where({
        projectId,
      }).delete();

      await tx.orm.public.Project.where({
        id: projectId,
      }).delete();

      return {
        message: 'Project berhasil dihapus',
      };
    });
  }
  async findAll(userId: string): Promise<ProjectListItem[]> {
    const memberships = await this.prisma.client.orm.public.ProjectMember.where(
      {
        userId,
      },
    )
      .select('projectId', 'role')
      .all();

    const results: ProjectListItem[] = [];

    for (const membership of memberships) {
      const project = await this.prisma.client.orm.public.Project.where({
        id: membership.projectId,
      })
        .select('id', 'name', 'description', 'status', 'createdBy')
        .first();

      if (!project) {
        continue;
      }

      results.push({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdBy: project.createdBy,
        role: membership.role,
      });
    }

    return results;
  }
  async findOne(projectId: string, userId: string): Promise<ProjectListItem> {
    const membership = await this.prisma.client.orm.public.ProjectMember.where({
      projectId,
      userId,
    })
      .select('projectId', 'role')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    const project = await this.prisma.client.orm.public.Project.where({
      id: projectId,
    })
      .select('id', 'name', 'description', 'status', 'createdBy')
      .first();

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,
      role: membership.role,
    };
  }
  private async getMembership(projectId: string, userId: string) {
    const membership = await this.prisma.client.orm.public.ProjectMember.where({
      projectId,
      userId,
    })
      .select('projectId', 'userId', 'role')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member project ini');
    }

    return membership;
  }
  async addMember(
  projectId: string,
  currentUserId: string,
  data: AddProjectMemberDto,
) {
  const membership = await this.getMembership(
    projectId,
    currentUserId,
  );

  if (
    membership.role !== 'OWNER' &&
    membership.role !== 'ADMIN'
  ) {
    throw new ForbiddenException(
      'Anda tidak memiliki izin untuk menambahkan member',
    );
  }

  const project =
    await this.prisma.client.orm.public.Project
      .where({
        id: projectId,
      })
      .first();

  if (!project) {
    throw new NotFoundException(
      'Project tidak ditemukan',
    );
  }

  const user =
    await this.prisma.client.orm.public.User
      .where({
        id: data.userId,
      })
      .select(
        'id',
        'username',
        'email',
        'name',
      )
      .first();

  if (!user) {
    throw new NotFoundException(
      'User tidak ditemukan',
    );
  }

  const existingMember =
    await this.prisma.client.orm.public.ProjectMember
      .where({
        projectId,
        userId: data.userId,
      })
      .first();

  if (existingMember) {
    throw new ConflictException(
      'User sudah menjadi member project',
    );
  }

  const member =
    await this.prisma.client.orm.public.ProjectMember.create({
      projectId,
      userId: data.userId,
      role: data.role,
    });

  return {
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    role: member.role,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
  };
}
}
