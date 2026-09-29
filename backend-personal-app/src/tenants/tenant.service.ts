import {
ConflictException ,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { AddTenantMemberDto } from './dto/add-tenant-member.dto.js';
import { UpdateTenantMemberDto } from './dto/update-tenant-member.dto.js';
import { CreateTenantInvitationDto } from './dto/create-tenant-invitation.dto.js';
import { EmailService } from '../email/email.service.js';
import { randomBytes } from 'node:crypto';

export interface TenantListItem {
  id: string;
  name: string;
  createdBy: string;
  role: string;
}
export interface TenantMemberListItem {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  roleId: string | null;
  roleName: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string | null;
  };
}
export interface TenantResponse extends TenantListItem {}

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(
    data: CreateTenantDto,
    userId: string,
  ): Promise<TenantResponse> {
    const name = data.name.trim();

    return this.prisma.client.transaction(async (tx) => {
      const tenant = await tx.orm.public.Tenant.create({
        name,
        createdBy: userId,
      });

      await tx.orm.public.TenantMember.create({
        tenantId: tenant.id,
        userId,
        role: 'OWNER',
      });

      return {
        id: tenant.id,
        name: tenant.name,
        createdBy: tenant.createdBy,
        role: 'OWNER',
      };
    });
  }

  async findAll(userId: string): Promise<TenantListItem[]> {
    const memberships =
      await this.prisma.client.orm.public.TenantMember
        .where({
          userId,
        })
        .select('tenantId', 'role', 'roleId')
        .all();

    const results: TenantListItem[] = [];

    for (const membership of memberships) {
      const tenant =
        await this.prisma.client.orm.public.Tenant
          .where({
            id: membership.tenantId,
          })
          .select('id', 'name', 'createdBy')
          .first();

      if (!tenant) {
        continue;
      }

      let roleName = membership.role as string;
      if (membership.roleId) {
        const customRole = await this.prisma.client.orm.public.TenantCustomRole
          .where({ id: membership.roleId, tenantId: membership.tenantId })
          .select('name')
          .first();
        if (customRole) roleName = customRole.name;
      }

      results.push({
        id: tenant.id,
        name: tenant.name,
        createdBy: tenant.createdBy,
        role: roleName,
      });
    }

    return results;
  }

  async findOne(
    tenantId: string,
    userId: string,
  ): Promise<TenantResponse> {
    const membership = await this.getMembership(
      tenantId,
      userId,
    );

    const tenant =
      await this.prisma.client.orm.public.Tenant
        .where({
          id: tenantId,
        })
        .select('id', 'name', 'createdBy')
        .first();

    if (!tenant) {
      throw new NotFoundException(
        'Tenant tidak ditemukan',
      );
    }

    return {
      id: tenant.id,
      name: tenant.name,
      createdBy: tenant.createdBy,
      role: membership.role,
    };
  }


  private async hasWorkspacePermission(
    tenantId: string,
    userId: string,
    module: 'WORKSPACE_MEMBERS' | 'WORKSPACE_SETTINGS',
    action: 'CREATE' | 'UPDATE' | 'DELETE',
  ): Promise<boolean> {
    const membership = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .select('role', 'roleId')
      .first();

    if (!membership) return false;
    if (membership.role === 'OWNER' || membership.role === 'ADMIN') return true;
    if (!membership.roleId) return false;

    const permission = await this.prisma.client.orm.public.TenantRolePermission
      .where({ roleId: membership.roleId, module })
      .first();

    if (!permission) return false;

    return Boolean(
      action === 'CREATE' ? permission.canCreate :
      action === 'UPDATE' ? permission.canUpdate :
      permission.canDelete,
    );
  }

  async update(
    tenantId: string,
    userId: string,
    data: UpdateTenantDto,
  ): Promise<TenantResponse> {
    const membership = await this.getMembership(
      tenantId,
      userId,
    );

    if (!(await this.hasWorkspacePermission(tenantId, userId, 'WORKSPACE_SETTINGS', 'UPDATE'))) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk mengubah workspace ini');
    }

    const updated =
      await this.prisma.client.orm.public.Tenant
        .where({
          id: tenantId,
        })
        .update({
          name: data.name.trim(),
        });

    if (!updated) {
      throw new NotFoundException(
        'Tenant tidak ditemukan atau gagal diperbarui',
      );
    }

    return {
      id: updated.id,
      name: updated.name,
      createdBy: updated.createdBy,
      role: membership.role,
    };
  }


  async getMembershipForContext(
    tenantId: string,
    userId: string,
  ) {
    return this.prisma.client.orm.public.TenantMember
      .where({
        tenantId,
        userId,
      })
      .select(
        'tenantId',
        'userId',
        'role',
        'roleId',
      )
      .first();
  }

  private async getMembership(
    tenantId: string,
    userId: string,
  ) {
    const membership =
      await this.prisma.client.orm.public.TenantMember
        .where({
          tenantId,
          userId,
        })
        .select(
          'tenantId',
          'userId',
          'role',
        )
        .first();

    if (!membership) {
      throw new ForbiddenException(
        'Anda bukan member workspace ini',
      );
    }

    return membership;
  }
  async findMembers(
  tenantId: string,
  currentUserId: string,
): Promise<TenantMemberListItem[]> {
  await this.getMembership(
    tenantId,
    currentUserId,
  );

  const members =
    await this.prisma.client.orm.public.TenantMember
      .where({
        tenantId,
      })
      .select(
        'id',
        'tenantId',
        'userId',
        'role',
        'roleId',
      )
      .all();

  const results: TenantMemberListItem[] = [];

  for (const member of members) {
    const user =
      await this.prisma.client.orm.public.User
        .where({
          id: member.userId,
        })
        .select(
          'id',
          'username',
          'email',
          'name',
        )
        .first();

    if (!user) {
      continue;
    }

    let roleName = member.role as string;
    if (member.roleId) {
      const customRole = await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: member.roleId, tenantId })
        .select('name')
        .first();
      if (customRole) roleName = customRole.name;
    }

    results.push({
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role,
      roleId: member.roleId ?? null,
      roleName,
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
async addMember(
  tenantId: string,
  currentUserId: string,
  data: AddTenantMemberDto,
): Promise<TenantMemberListItem> {
  const currentMembership =
    await this.getMembership(
      tenantId,
      currentUserId,
    );

  if (!(await this.hasWorkspacePermission(tenantId, currentUserId, 'WORKSPACE_MEMBERS', 'CREATE'))) {
    throw new ForbiddenException('Anda tidak memiliki izin untuk menambahkan member');
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
    await this.prisma.client.orm.public.TenantMember
      .where({
        tenantId,
        userId: data.userId,
      })
      .first();

  if (existingMember) {
    throw new ConflictException(
      'User sudah menjadi member workspace',
    );
  }

  if (data.roleId) {
    const customRole =
      await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: data.roleId, tenantId })
        .first();

    if (!customRole) {
      throw new NotFoundException('Role tidak ditemukan pada workspace ini');
    }

    if (customRole.isSystem) {
      throw new ForbiddenException('System role tidak dapat diberikan kepada member biasa');
    }
  }

  const member =
    await this.prisma.client.orm.public.TenantMember
      .create({
        tenantId,
        userId: data.userId,
        role: 'MEMBER',
        roleId: data.roleId ?? null,
      });

  return {
    id: member.id,
    tenantId: member.tenantId,
    userId: member.userId,
    role: member.role,
    roleId: member.roleId ?? null,
    roleName: member.role,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
  };
}
async updateMemberRole(
  tenantId: string,
  currentUserId: string,
  targetUserId: string,
  data: UpdateTenantMemberDto,
): Promise<TenantMemberListItem> {
  const currentMembership =
    await this.getMembership(
      tenantId,
      currentUserId,
    );

  const targetMembership =
    await this.prisma.client.orm.public.TenantMember
      .where({
        tenantId,
        userId: targetUserId,
      })
      .select(
        'id',
        'tenantId',
        'userId',
        'role',
      )
      .first();

  if (!targetMembership) {
    throw new NotFoundException(
      'Member tidak ditemukan pada workspace ini',
    );
  }

  if (targetMembership.role === 'OWNER') {
    throw new ForbiddenException(
      'Role OWNER tidak dapat diubah',
    );
  }

  if (
    currentMembership.role === 'ADMIN' &&
    targetMembership.role === 'ADMIN'
  ) {
    throw new ForbiddenException(
      'ADMIN tidak dapat mengubah role ADMIN lainnya',
    );
  }

  if (!(await this.hasWorkspacePermission(tenantId, currentUserId, 'WORKSPACE_MEMBERS', 'UPDATE'))) {
    throw new ForbiddenException('Anda tidak memiliki izin untuk mengubah role member');
  }

  const customRole =
    await this.prisma.client.orm.public.TenantCustomRole
      .where({ id: data.roleId, tenantId })
      .first();

  if (!customRole) {
    throw new NotFoundException('Role tidak ditemukan pada workspace ini');
  }

  if (customRole.isSystem) {
    throw new ForbiddenException('System role tidak dapat diberikan kepada member');
  }

  const updated =
    await this.prisma.client.orm.public.TenantMember
      .where({
        id: targetMembership.id,
      })
      .update({
        role: 'MEMBER',
        roleId: data.roleId,
      });

  if (!updated) {
    throw new NotFoundException(
      'Member tidak ditemukan atau gagal diperbarui',
    );
  }

  const user =
    await this.prisma.client.orm.public.User
      .where({
        id: updated.userId,
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

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    userId: updated.userId,
    role: updated.role,
    roleId: updated.roleId ?? null,
    roleName: customRole.name,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
  };
}
async removeMember(
  tenantId: string,
  currentUserId: string,
  targetUserId: string,
): Promise<{ message: string }> {
  const currentMembership =
    await this.getMembership(
      tenantId,
      currentUserId,
    );

  const targetMembership =
    await this.prisma.client.orm.public.TenantMember
      .where({
        tenantId,
        userId: targetUserId,
      })
      .select(
        'id',
        'tenantId',
        'userId',
        'role',
      )
      .first();

  if (!targetMembership) {
    throw new NotFoundException(
      'Member tidak ditemukan pada workspace ini',
    );
  }

  if (targetMembership.role === 'OWNER') {
    throw new ForbiddenException(
      'OWNER tidak dapat dihapus dari workspace',
    );
  }

  if (!(await this.hasWorkspacePermission(tenantId, currentUserId, 'WORKSPACE_MEMBERS', 'DELETE'))) {
    throw new ForbiddenException('Anda tidak memiliki izin untuk menghapus member');
  }

  if (
    currentMembership.role === 'ADMIN' &&
    targetMembership.role === 'ADMIN'
  ) {
    throw new ForbiddenException(
      'ADMIN tidak dapat menghapus ADMIN lainnya',
    );
  }

  const deleted =
    await this.prisma.client.orm.public.TenantMember
      .where({
        id: targetMembership.id,
      })
      .delete();

  if (!deleted) {
    throw new NotFoundException(
      'Member tidak ditemukan atau gagal dihapus',
    );
  }

  return {
    message: 'Member berhasil dihapus dari workspace',
  };
}
  async createInvitation(
    tenantId: string,
    currentUserId: string,
    data: CreateTenantInvitationDto,
  ): Promise<{ message: string; email: string; role: string }> {
    const membership = await this.getMembership(tenantId, currentUserId);

    if (!(await this.hasWorkspacePermission(tenantId, currentUserId, 'WORKSPACE_MEMBERS', 'CREATE'))) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk mengundang member');
    }

    if (!data.roleId) {
      throw new ForbiddenException('Role wajib dipilih');
    }

    const customRole =
      await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: data.roleId, tenantId })
        .first();

    if (!customRole) {
      throw new NotFoundException('Role tidak ditemukan pada workspace ini');
    }

    if (customRole.isSystem) {
      throw new ForbiddenException('System role tidak dapat dipilih untuk invitation');
    }

    const email = data.email.trim().toLowerCase();

    const user = await this.prisma.client.orm.public.User
      .where({ email })
      .select('id', 'email')
      .first();

    if (user) {
      const existingMember =
        await this.prisma.client.orm.public.TenantMember
          .where({ tenantId, userId: user.id })
          .first();

      if (existingMember) {
        throw new ConflictException(
          'Email tersebut sudah menjadi member workspace',
        );
      }
    }

    const tenant = await this.prisma.client.orm.public.Tenant
      .where({ id: tenantId })
      .select('id', 'name')
      .first();

    if (!tenant) {
      throw new NotFoundException('Workspace tidak ditemukan');
    }

    const inviter = await this.prisma.client.orm.public.User
      .where({ id: currentUserId })
      .select('name', 'username')
      .first();

    const oldInvitation =
      await this.prisma.client.orm.public.TenantInvitation
        .where({ tenantId, email })
        .select('id')
        .first();

    if (oldInvitation) {
      await this.prisma.client.orm.public.TenantInvitation
        .where({ id: oldInvitation.id })
        .delete();
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.prisma.client.orm.public.TenantInvitation.create({
      tenantId,
      email,
      role: 'MEMBER',
      roleId: data.roleId,
      token,
      invitedBy: currentUserId,
      expiresAt,
    });

    const frontendUrl = (
      process.env.FRONTEND_URL ?? 'http://localhost:3000'
    ).replace(/\/$/, '');

    const acceptUrl =
      `${frontendUrl}/invitations/accept?token=${encodeURIComponent(token)}`;

    try {
      await this.emailService.sendTenantInvitation({
        to: email,
        tenantName: tenant.name,
        role: customRole.name,
        inviterName:
          inviter?.name ??
          inviter?.username ??
          'Workspace admin',
        acceptUrl,
      });
    } catch (error) {
      await this.prisma.client.orm.public.TenantInvitation
        .where({ token })
        .delete();
      throw error;
    }

    return {
      message: 'Invitation berhasil dikirim',
      email,
      role: customRole.name,
    };
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{ message: string; tenantId: string; role: string }> {
    const invitation =
      await this.prisma.client.orm.public.TenantInvitation
        .where({ token })
        .select(
          'id',
          'tenantId',
          'email',
          'role',
          'roleId',
          'expiresAt',
          'acceptedAt',
        )
        .first();

    if (!invitation) {
      throw new NotFoundException('Invitation tidak ditemukan');
    }

    if (invitation.acceptedAt) {
      throw new ConflictException('Invitation sudah digunakan');
    }

    if (
      new Date(
        invitation.expiresAt as string | Date,
      ).getTime() <= Date.now()
    ) {
      throw new ForbiddenException('Invitation sudah kedaluwarsa');
    }

    const user = await this.prisma.client.orm.public.User
      .where({ id: userId })
      .select('id', 'email')
      .first();

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'Invitation ini dikirim ke email yang berbeda',
      );
    }

    const existingMember =
      await this.prisma.client.orm.public.TenantMember
        .where({
          tenantId: invitation.tenantId,
          userId,
        })
        .first();

    if (existingMember) {
      throw new ConflictException(
        'Anda sudah menjadi member workspace ini',
      );
    }

    await this.prisma.client.orm.public.TenantMember.create({
      tenantId: invitation.tenantId,
      userId,
      role: 'MEMBER',
      roleId: invitation.roleId ?? null,
    });

    await this.prisma.client.orm.public.TenantInvitation
      .where({ id: invitation.id })
      .update({
        acceptedAt: new Date().toISOString(),
      });

    return {
      message: 'Invitation berhasil diterima',
      tenantId: invitation.tenantId,
      role: invitation.roleId ?? invitation.role,
    };
  }

}