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
        .select('tenantId', 'role')
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

      results.push({
        id: tenant.id,
        name: tenant.name,
        createdBy: tenant.createdBy,
        role: membership.role,
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

  async update(
    tenantId: string,
    userId: string,
    data: UpdateTenantDto,
  ): Promise<TenantResponse> {
    const membership = await this.getMembership(
      tenantId,
      userId,
    );

    if (
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah workspace ini',
      );
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

    results.push({
      id: member.id,
      tenantId: member.tenantId,
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

  if (
    currentMembership.role !== 'OWNER' &&
    currentMembership.role !== 'ADMIN'
  ) {
    throw new ForbiddenException(
      'Anda tidak memiliki izin untuk menambahkan member',
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

  const member =
    await this.prisma.client.orm.public.TenantMember
      .create({
        tenantId,
        userId: data.userId,
        role: data.role,
      });

  return {
    id: member.id,
    tenantId: member.tenantId,
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

  if (
    currentMembership.role !== 'OWNER' &&
    currentMembership.role !== 'ADMIN'
  ) {
    throw new ForbiddenException(
      'Anda tidak memiliki izin untuk mengubah role member',
    );
  }

  const updated =
    await this.prisma.client.orm.public.TenantMember
      .where({
        id: targetMembership.id,
      })
      .update({
        role: data.role,
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

  if (
    currentMembership.role !== 'OWNER' &&
    currentMembership.role !== 'ADMIN'
  ) {
    throw new ForbiddenException(
      'Anda tidak memiliki izin untuk menghapus member',
    );
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
}