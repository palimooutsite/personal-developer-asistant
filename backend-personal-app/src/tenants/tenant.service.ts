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
import { PERMISSION_MODULES } from './roles/permission.constants.js';
import { AuditService } from '../audit/audit.service.js';
import { db } from '../prisma/db.js';

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
  roleId: string;
  roleName: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string | null;
  };
}
export interface TenantResponse extends TenantListItem {}

type TenantOrmClient = Pick<typeof db, 'orm'>;
type TenantTransactionClient = TenantOrmClient & { execute: (plan: any) => Promise<number> };

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
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

      const ownerRole = await tx.orm.public.TenantCustomRole.create({
        tenantId: tenant.id,
        name: 'Owner',
        description: 'System role dengan akses penuh workspace.',
        isSystem: true,
      });

      for (const module of PERMISSION_MODULES) {
        await tx.orm.public.TenantRolePermission.create({
          roleId: ownerRole.id,
          module,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        });
      }

      await tx.orm.public.TenantMember.create({
        tenantId: tenant.id,
        userId,
        role: 'OWNER',
        roleId: ownerRole.id,
      });

      await this.auditService.create({
        action: 'WORKSPACE.CREATED',
        entity: 'Tenant',
        entityId: tenant.id,
        tenantId: tenant.id,
        userId,
        description: `Workspace ${tenant.name} dibuat`,
        metadata: { name: tenant.name },
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

  async getPermissions(
    tenantId: string,
    userId: string,
  ) {
    const membership = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId })
      .select('role', 'roleId')
      .first();

    if (!membership) {
      throw new ForbiddenException('Anda bukan member workspace ini');
    }

    const modules = PERMISSION_MODULES;

    const fullPermission = {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    };

    if (!membership.roleId) {
      throw new ForbiddenException('Membership belum memiliki custom role');
    }

    let roleName = membership.role as string;
    let permissions = modules.map((module) => ({
      module,
      ...fullPermission,
    }));

    if (membership.roleId) {
      const customRole = await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: membership.roleId, tenantId })
        .select('name')
        .first();

      if (!customRole) {
        throw new ForbiddenException('Role workspace tidak ditemukan');
      }

      roleName = customRole.name;
      const rows = await this.prisma.client.orm.public.TenantRolePermission
        .where({ roleId: membership.roleId })
        .select('module', 'canCreate', 'canRead', 'canUpdate', 'canDelete')
        .all();

      permissions = modules.map((module) => {
        const row = rows.find((item) => item.module === module);
        return {
          module,
          canCreate: Boolean(row?.canCreate),
          canRead: Boolean(row?.canRead),
          canUpdate: Boolean(row?.canUpdate),
          canDelete: Boolean(row?.canDelete),
        };
      });
    }

    return {
      tenantId,
      roleName,
      permissions,
    };
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

    if (!membership?.roleId) return false;

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

  private async assertWorkspaceMemberCapacityWithClient(
    client: TenantOrmClient,
    tenantId: string,
    excludedInvitationId?: string,
  ): Promise<void> {
    const subscriptions = await client.orm.public.TenantSubscription.where({ tenantId }).all();
    const subscription = subscriptions
      .filter((item) => ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(String(item.status)))
      .sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)))[0];

    if (!subscription) throw new ConflictException('Workspace belum memiliki subscription aktif');

    const feature = await client.orm.public.SubscriptionFeature.where({ code: 'WORKSPACE_MEMBER' }).first();
    if (!feature || !feature.isActive) {
      throw new ConflictException('Feature batas member workspace belum dikonfigurasi');
    }

    const packageFeature = await client.orm.public.SubscriptionPackageFeature
      .where({ packageId: subscription.packageId, featureId: feature.id }).first();
    if (!packageFeature?.enabled) {
      throw new ConflictException('Paket workspace tidak mengizinkan penambahan member');
    }

    const memberRows = await client.orm.public.TenantMember.where({ tenantId }).select('id').all();
    const invitationRows = await client.orm.public.TenantInvitation
      .where({ tenantId }).select('id', 'acceptedAt', 'expiresAt').all();

    const now = Date.now();
    const pendingInvitations = invitationRows.filter((item) =>
      item.id !== excludedInvitationId &&
      !item.acceptedAt &&
      new Date(item.expiresAt as string | Date).getTime() > now,
    ).length;

    const reservedMembers = memberRows.length + pendingInvitations;
    if (packageFeature.limitValue !== null && reservedMembers >= packageFeature.limitValue) {
      throw new ConflictException({
        code: 'WORKSPACE_MEMBER_LIMIT_REACHED',
        message: 'Limit member workspace pada paket saat ini sudah tercapai',
        currentMembers: memberRows.length,
        pendingInvitations,
        limit: packageFeature.limitValue,
        remaining: Math.max(0, packageFeature.limitValue - reservedMembers),
      });
    }
  }

  private async assertWorkspaceMemberCapacity(
    tenantId: string,
    excludedInvitationId?: string,
  ): Promise<void> {
    return this.assertWorkspaceMemberCapacityWithClient(
      this.prisma.client,
      tenantId,
      excludedInvitationId,
    );
  }

  private async lockTenantForMemberCapacity(
    client: TenantTransactionClient,
    tenantId: string,
  ): Promise<void> {
    const lockPlan = db.raw.sql`
      UPDATE "public"."tenant"
      SET "updatedAt" = "updatedAt"
      WHERE "id" = ${tenantId}
    `.affectedCount().build();

    if ((await client.execute(lockPlan)) !== 1) {
      throw new NotFoundException('Workspace tidak ditemukan');
    }
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
          'roleId',
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

    if (!member.roleId) {
      throw new ForbiddenException(
        'Member belum memiliki custom role',
      );
    }

    results.push({
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role,
      roleId: member.roleId,
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

  const result = await this.prisma.client.transaction(async (tx) => {
    await this.lockTenantForMemberCapacity(tx, tenantId);

    const existingMember = await tx.orm.public.TenantMember
      .where({ tenantId, userId: data.userId })
      .first();
    if (existingMember) {
      throw new ConflictException('User sudah menjadi member workspace');
    }

    await this.assertWorkspaceMemberCapacityWithClient(tx, tenantId);

    const customRole = await tx.orm.public.TenantCustomRole
      .where({ id: data.roleId, tenantId })
      .first();
    if (!customRole) {
      throw new NotFoundException('Role tidak ditemukan pada workspace ini');
    }
    if (customRole.isSystem) {
      throw new ForbiddenException('System role tidak dapat diberikan kepada member biasa');
    }

    const member = await tx.orm.public.TenantMember.create({
      tenantId,
      userId: data.userId,
      role: 'MEMBER',
      roleId: data.roleId,
    });

  const { member, customRole } = result;

    return { member, customRole };
  });

  if (!member.roleId) {
    throw new ForbiddenException(
      'Member berhasil dibuat tetapi custom role tidak tersedia',
    );
  }

  await this.auditService.create({
    action: 'WORKSPACE.MEMBER_ADDED',
    entity: 'TenantMember',
    entityId: member.id,
    tenantId,
    userId: currentUserId,
    description: `Member ${user.email} ditambahkan ke workspace`,
    metadata: { memberUserId: user.id, memberEmail: user.email, roleId: customRole.id, roleName: customRole.name },
  });

  return {
    id: member.id,
    tenantId: member.tenantId,
    userId: member.userId,
    role: member.role,
    roleId: member.roleId,
    roleName: customRole.name,
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
  await this.getMembership(tenantId, currentUserId);

  const targetMembership =
    await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId: targetUserId })
      .select('id', 'tenantId', 'userId', 'roleId')
      .first();

  if (!targetMembership) {
    throw new NotFoundException(
      'Member tidak ditemukan pada workspace ini',
    );
  }

  const targetRole = targetMembership.roleId
    ? await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: targetMembership.roleId, tenantId })
        .select('id', 'name', 'isSystem')
        .first()
    : null;

  if (targetRole?.isSystem && targetRole.name === 'Owner') {
    throw new ForbiddenException(
      'Role Owner tidak dapat diubah',
    );
  }

  if (
    !(await this.hasWorkspacePermission(
      tenantId,
      currentUserId,
      'WORKSPACE_MEMBERS',
      'UPDATE',
    ))
  ) {
    throw new ForbiddenException(
      'Anda tidak memiliki izin untuk mengubah role member',
    );
  }

  const customRole =
    await this.prisma.client.orm.public.TenantCustomRole
      .where({ id: data.roleId, tenantId })
      .first();

  if (!customRole) {
    throw new NotFoundException(
      'Role tidak ditemukan pada workspace ini',
    );
  }

  if (customRole.isSystem) {
    throw new ForbiddenException(
      'System role tidak dapat diberikan kepada member',
    );
  }

  const updated =
    await this.prisma.client.orm.public.TenantMember
      .where({ id: targetMembership.id })
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
      .where({ id: updated.userId })
      .select('id', 'username', 'email', 'name')
      .first();

  if (!user) {
    throw new NotFoundException('User tidak ditemukan');
  }

  if (!updated.roleId) {
    throw new ForbiddenException(
      'Member berhasil diperbarui tetapi custom role tidak tersedia',
    );
  }

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    userId: updated.userId,
    role: updated.role,
    roleId: updated.roleId,
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
  await this.getMembership(tenantId, currentUserId);

  const targetMembership =
    await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId: targetUserId })
      .select('id', 'tenantId', 'userId', 'roleId')
      .first();

  if (!targetMembership) {
    throw new NotFoundException(
      'Member tidak ditemukan pada workspace ini',
    );
  }

  const targetRole = targetMembership.roleId
    ? await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: targetMembership.roleId, tenantId })
        .select('id', 'name', 'isSystem')
        .first()
    : null;

  if (targetRole?.isSystem && targetRole.name === 'Owner') {
    throw new ForbiddenException(
      'Owner tidak dapat dihapus dari workspace',
    );
  }

  if (
    !(await this.hasWorkspacePermission(
      tenantId,
      currentUserId,
      'WORKSPACE_MEMBERS',
      'DELETE',
    ))
  ) {
    throw new ForbiddenException(
      'Anda tidak memiliki izin untuk menghapus member',
    );
  }

  const deleted =
    await this.prisma.client.orm.public.TenantMember
      .where({ id: targetMembership.id })
      .delete();

  if (!deleted) {
    throw new NotFoundException(
      'Member tidak ditemukan atau gagal dihapus',
    );
  }

  await this.auditService.create({
    action: 'WORKSPACE.MEMBER_REMOVED',
    entity: 'TenantMember',
    entityId: deleted.id,
    tenantId,
    userId: currentUserId,
    description: 'Member dihapus dari workspace',
    metadata: { memberUserId: targetUserId },
  });

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

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.prisma.client.transaction(async (tx) => {
      await this.lockTenantForMemberCapacity(tx, tenantId);

      const currentUserMember = await tx.orm.public.TenantMember
        .where({ tenantId, userId: currentUserId })
        .first();
      if (!currentUserMember) {
        throw new ForbiddenException('Anda bukan member workspace ini');
      }

      const existingMember = user
        ? await tx.orm.public.TenantMember
            .where({ tenantId, userId: user.id })
            .first()
        : null;
      if (existingMember) {
        throw new ConflictException(
          'Email tersebut sudah menjadi member workspace',
        );
      }

      const oldInvitation = await tx.orm.public.TenantInvitation
        .where({ tenantId, email })
        .select('id')
        .first();

      // Replacing an existing invitation releases its reservation, so exclude
      // it from the capacity calculation before creating the new reservation.
      await this.assertWorkspaceMemberCapacityWithClient(
        tx,
        tenantId,
        oldInvitation?.id,
      );

      if (oldInvitation) {
        await tx.orm.public.TenantInvitation
          .where({ id: oldInvitation.id })
          .delete();
      }

      await tx.orm.public.TenantInvitation.create({
        tenantId,
        email,
        role: 'MEMBER',
        roleId: data.roleId,
        token,
        invitedBy: currentUserId,
        expiresAt,
      });
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

    if (!invitation.roleId) {
      throw new ForbiddenException('Invitation belum memiliki custom role');
    }

    const invitationRole =
      await this.prisma.client.orm.public.TenantCustomRole
        .where({ id: invitation.roleId, tenantId: invitation.tenantId })
        .select('name')
        .first();

    if (!invitationRole) {
      throw new ForbiddenException('Role invitation tidak ditemukan');
    }

    await this.prisma.client.transaction(async (tx) => {
      await this.lockTenantForMemberCapacity(tx, invitation.tenantId);

      const currentInvitation = await tx.orm.public.TenantInvitation
        .where({ id: invitation.id })
        .select('id', 'acceptedAt', 'expiresAt')
        .first();

      if (!currentInvitation || currentInvitation.acceptedAt) {
        throw new ConflictException('Invitation sudah digunakan');
      }

      if (
        new Date(currentInvitation.expiresAt as string | Date).getTime() <=
        Date.now()
      ) {
        throw new ForbiddenException('Invitation sudah kedaluwarsa');
      }

      const existingMember = await tx.orm.public.TenantMember
        .where({ tenantId: invitation.tenantId, userId })
        .first();

      if (existingMember) {
        throw new ConflictException('Anda sudah menjadi member workspace ini');
      }

      await this.assertWorkspaceMemberCapacityWithClient(
        tx,
        invitation.tenantId,
        invitation.id,
      );

      const currentRole = await tx.orm.public.TenantCustomRole
        .where({ id: invitation.roleId, tenantId: invitation.tenantId })
        .select('id')
        .first();

      if (!currentRole) {
        throw new ForbiddenException('Role invitation tidak ditemukan');
      }

      await tx.orm.public.TenantMember.create({
        tenantId: invitation.tenantId,
        userId,
        role: 'MEMBER',
        roleId: invitation.roleId,
      });

      await tx.orm.public.TenantInvitation
        .where({ id: invitation.id })
        .update({
          acceptedAt: new Date().toISOString(),
        });
    });

    await this.auditService.create({
      action: 'WORKSPACE.MEMBER_ADDED',
      entity: 'TenantMember',
      entityId: invitation.tenantId,
      tenantId: invitation.tenantId,
      userId,
      description: `Member ${user.email} bergabung melalui invitation`,
      metadata: { memberUserId: user.id, memberEmail: user.email, roleId: invitation.roleId, roleName: invitationRole.name, source: 'INVITATION' },
    });

    return {
      message: 'Invitation berhasil diterima',
      tenantId: invitation.tenantId,
      role: invitationRole.name,
    };
  }

}