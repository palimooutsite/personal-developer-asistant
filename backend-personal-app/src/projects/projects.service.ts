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
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { BillingFeatureService } from '../billing/feature.service.js';

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

export interface ProjectMemberListItem {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string | null;
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingFeatureService: BillingFeatureService,
  ) {}

  async create(
    data: CreateProjectDto,
    userId: string,
    tenantId: string,
  ): Promise<ProjectResponse> {
    const existingProjects = await this.prisma.client.orm.public.Project
      .where({ tenantId })
      .select('id')
      .all();

    await this.billingFeatureService.assertWithinLimit(
      tenantId,
      userId,
      'PROJECT',
      existingProjects.length,
    );

    return this.prisma.client.transaction(async (tx) => {
      const project = await tx.orm.public.Project.create({
        name: data.name,
        description: data.description,
        createdBy: userId,
        tenantId,
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
    tenantId: string,
    data: UpdateProjectDto,
  ): Promise<ProjectListItem> {
    const membership = await this.getMembership(projectId, userId, tenantId);

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

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await this.prisma.client.orm.public.Project
      .where({
        id: projectId,
        tenantId,
      })
      .update(updateData);

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
    tenantId: string,
  ): Promise<{ message: string }> {
    const membership = await this.getMembership(projectId, userId, tenantId);

    if (membership.role !== 'OWNER') {
      throw new ForbiddenException('Hanya OWNER yang dapat menghapus project');
    }

    return this.prisma.client.transaction(async (tx) => {
      const project = await tx.orm.public.Project.where({
        id: projectId,
        tenantId,
      }).first();

      if (!project) {
        throw new NotFoundException('Project tidak ditemukan');
      }

      await tx.orm.public.ProjectMember.where({ projectId }).delete();
      await tx.orm.public.Project.where({ id: projectId, tenantId }).delete();

      return { message: 'Project berhasil dihapus' };
    });
  }

  async findAll(userId: string, tenantId: string): Promise<ProjectListItem[]> {
    const memberships = await this.prisma.client.orm.public.ProjectMember
      .where({ userId })
      .select('projectId', 'role')
      .all();

    const results: ProjectListItem[] = [];

    for (const membership of memberships) {
      const project = await this.prisma.client.orm.public.Project
        .where({
          id: membership.projectId,
          tenantId,
        })
        .select('id', 'name', 'description', 'status', 'createdBy')
        .first();

      if (!project) continue;

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

  async findOne(
    projectId: string,
    userId: string,
    tenantId: string,
  ): Promise<ProjectListItem> {
    const membership = await this.getMembership(projectId, userId, tenantId);

    const project = await this.prisma.client.orm.public.Project
      .where({
        id: projectId,
        tenantId,
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

  private async getMembership(
    projectId: string,
    userId: string,
    tenantId: string,
  ) {
    const project = await this.prisma.client.orm.public.Project
      .where({
        id: projectId,
        tenantId,
      })
      .select('id')
      .first();

    if (!project) {
      throw new ForbiddenException('Project bukan bagian dari workspace aktif');
    }

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

    return membership;
  }

  async findMembers(
    projectId: string,
    currentUserId: string,
    tenantId: string,
  ): Promise<ProjectMemberListItem[]> {
    await this.getMembership(projectId, currentUserId, tenantId);

    const members = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId })
      .select('id', 'projectId', 'userId', 'role')
      .all();

    const results: ProjectMemberListItem[] = [];

    for (const member of members) {
      const user = await this.prisma.client.orm.public.User
        .where({ id: member.userId })
        .select('id', 'username', 'email', 'name')
        .first();

      if (!user) continue;

      results.push({
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
      });
    }

    return results;
  }

  async updateMemberRole(
    projectId: string,
    currentUserId: string,
    targetUserId: string,
    tenantId: string,
    data: UpdateProjectMemberDto,
  ): Promise<ProjectMemberListItem> {
    const currentMembership = await this.getMembership(
      projectId,
      currentUserId,
      tenantId,
    );

    if (
      currentMembership.role !== 'OWNER' &&
      currentMembership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah role member',
      );
    }

    const targetMembership = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId: targetUserId })
      .select('id', 'projectId', 'userId', 'role')
      .first();

    if (!targetMembership) {
      throw new NotFoundException('Member tidak ditemukan pada project ini');
    }

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('Role OWNER tidak dapat diubah');
    }

    const updated = await this.prisma.client.orm.public.ProjectMember
      .where({ id: targetMembership.id })
      .update({ role: data.role });

    if (!updated) {
      throw new NotFoundException(
        'Member tidak ditemukan atau gagal diperbarui',
      );
    }

    const user = await this.prisma.client.orm.public.User
      .where({ id: updated.userId })
      .select('id', 'username', 'email', 'name')
      .first();

    if (!user) throw new NotFoundException('User tidak ditemukan');

    return {
      id: updated.id,
      projectId: updated.projectId,
      userId: updated.userId,
      role: updated.role,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
    };
  }

  async removeMember(
    projectId: string,
    currentUserId: string,
    targetUserId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const currentMembership = await this.getMembership(
      projectId,
      currentUserId,
      tenantId,
    );

    if (
      currentMembership.role !== 'OWNER' &&
      currentMembership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk menghapus member',
      );
    }

    const targetMembership = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId: targetUserId })
      .select('id', 'projectId', 'userId', 'role')
      .first();

    if (!targetMembership) {
      throw new NotFoundException('Member tidak ditemukan pada project ini');
    }

    if (targetMembership.role === 'OWNER') {
      throw new ForbiddenException('OWNER tidak dapat dihapus dari project');
    }

    const deleted = await this.prisma.client.orm.public.ProjectMember
      .where({ id: targetMembership.id })
      .delete();

    if (!deleted) {
      throw new NotFoundException(
        'Member tidak ditemukan atau gagal dihapus',
      );
    }

    return { message: 'Member berhasil dihapus dari project' };
  }

  async addMembers(
    projectId: string,
    currentUserId: string,
    members: AddProjectMemberDto[],
    tenantId: string,
  ): Promise<ProjectMemberListItem[]> {
    const membership = await this.getMembership(
      projectId,
      currentUserId,
      tenantId,
    );

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk menambahkan member',
      );
    }

    const uniqueMembers = Array.from(
      new Map(members.map((member) => [member.userId, member])).values(),
    );

    return this.prisma.client.transaction(async (tx) => {
      const project = await tx.orm.public.Project
        .where({ id: projectId, tenantId })
        .first();

      if (!project) {
        throw new NotFoundException('Project tidak ditemukan');
      }

      const results: ProjectMemberListItem[] = [];

      for (const memberInput of uniqueMembers) {
        const user = await tx.orm.public.User
          .where({ id: memberInput.userId })
          .select('id', 'username', 'email', 'name')
          .first();

        if (!user) {
          throw new NotFoundException(
            `User tidak ditemukan: ${memberInput.userId}`,
          );
        }

        const tenantMember = await tx.orm.public.TenantMember
          .where({
            tenantId,
            userId: memberInput.userId,
          })
          .select('tenantId', 'userId')
          .first();

        if (!tenantMember) {
          throw new ForbiddenException(
            `User ${user.username} bukan member workspace aktif`,
          );
        }

        const existingMember = await tx.orm.public.ProjectMember
          .where({
            projectId,
            userId: memberInput.userId,
          })
          .first();

        if (existingMember) {
          throw new ConflictException(
            `User ${user.username} sudah menjadi member project`,
          );
        }

        const member = await tx.orm.public.ProjectMember.create({
          projectId,
          userId: memberInput.userId,
          role: memberInput.role,
        });

        results.push({
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
        });
      }

      return results;
    });
  }

  async addMember(
    projectId: string,
    currentUserId: string,
    data: AddProjectMemberDto,
    tenantId: string,
  ): Promise<ProjectMemberListItem> {
    const membership = await this.getMembership(
      projectId,
      currentUserId,
      tenantId,
    );

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk menambahkan member',
      );
    }

    const project = await this.prisma.client.orm.public.Project
      .where({ id: projectId, tenantId })
      .first();

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const user = await this.prisma.client.orm.public.User
      .where({ id: data.userId })
      .select('id', 'username', 'email', 'name')
      .first();

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const tenantMember = await this.prisma.client.orm.public.TenantMember
      .where({
        tenantId,
        userId: data.userId,
      })
      .select('tenantId', 'userId')
      .first();

    if (!tenantMember) {
      throw new ForbiddenException(
        'User bukan member workspace aktif',
      );
    }

    const existingMember = await this.prisma.client.orm.public.ProjectMember
      .where({ projectId, userId: data.userId })
      .first();

    if (existingMember) {
      throw new ConflictException('User sudah menjadi member project');
    }

    const member = await this.prisma.client.orm.public.ProjectMember.create({
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
