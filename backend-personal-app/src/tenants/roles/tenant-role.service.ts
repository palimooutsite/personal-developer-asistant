import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PermissionAction, PermissionModule } from './permission.constants.js';
import { PERMISSION_MODULES } from './permission.constants.js';

export interface RolePermissionInput {
  module: PermissionModule;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

interface TenantCustomRoleRow {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CreateTenantRoleInput {
  name: string;
  description?: string;
  permissions: RolePermissionInput[];
}

@Injectable()
export class TenantRoleService {
  constructor(private readonly prisma: PrismaService) {}

  private fullPermissions() {
    return PERMISSION_MODULES.map((module) => ({
      module,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    }));
  }

  private async ensureSystemRole(
    tenantId: string,
    name: string,
    description: string,
  ): Promise<TenantCustomRoleRow> {
    const role = await this.prisma.client.orm.public.TenantCustomRole.upsert({
      create: {
        tenantId,
        name,
        description,
        isSystem: true,
      },
      update: {
        description,
        isSystem: true,
      },
      conflictOn: {
        tenantId,
        name,
      },
    });

    for (const permission of this.fullPermissions()) {
      await this.prisma.client.orm.public.TenantRolePermission.upsert({
        create: {
          roleId: role.id,
          ...permission,
        },
        update: {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        },
        conflictOn: {
          roleId: role.id,
          module: permission.module,
        },
      });
    }

    return role;
  }

  async ensureSystemRoles(tenantId: string): Promise<TenantCustomRoleRow> {
    const owner = await this.ensureSystemRole(
      tenantId,
      'Owner',
      'System role dengan akses penuh workspace.',
    );

    await this.ensureSystemRole(
      tenantId,
      'Admin',
      'System role dengan akses penuh workspace untuk administrator.',
    );

    await this.ensureSystemRole(
      tenantId,
      'Member',
      'System role kompatibilitas untuk member lama workspace.',
    );

    return owner;
  }

  async migrateLegacyMembers(tenantId: string) {
    const ownerRole = await this.ensureSystemRole(
      tenantId,
      'Owner',
      'System role dengan akses penuh workspace.',
    );
    const adminRole = await this.ensureSystemRole(
      tenantId,
      'Admin',
      'System role dengan akses penuh workspace untuk administrator.',
    );
    const memberRole = await this.ensureSystemRole(
      tenantId,
      'Member',
      'System role kompatibilitas untuk member lama workspace.',
    );

    const members = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId })
      .select('id', 'role', 'roleId')
      .all();

    let migrated = 0;
    let alreadyMigrated = 0;

    for (const member of members) {
      if (member.roleId) {
        alreadyMigrated += 1;
        continue;
      }

      const roleId =
        member.role === 'OWNER'
          ? ownerRole.id
          : member.role === 'ADMIN'
            ? adminRole.id
            : memberRole.id;

      const updated = await this.prisma.client.orm.public.TenantMember
        .where({ id: member.id })
        .update({ roleId });

      if (updated) {
        migrated += 1;
      }
    }

    return {
      tenantId,
      totalMembers: members.length,
      migrated,
      alreadyMigrated,
    };
  }

  async list(tenantId: string) {
    await this.ensureSystemRoles(tenantId);
    const roles = await this.prisma.client.orm.public.TenantCustomRole
      .where({ tenantId }).select('id','tenantId','name','description','isSystem').all();

    const result = [];
    for (const role of roles) {
      const permissions = await this.prisma.client.orm.public.TenantRolePermission
        .where({ roleId: role.id })
        .select('id','module','canCreate','canRead','canUpdate','canDelete').all();
      result.push({ ...role, permissions });
    }
    return result;
  }

  async create(tenantId: string, input: CreateTenantRoleInput) {
    const name = input.name.trim();
    if (!name) throw new ConflictException('Nama role wajib diisi');

    const existing = await this.prisma.client.orm.public.TenantCustomRole
      .where({ tenantId, name }).first();
    if (existing) throw new ConflictException('Role dengan nama tersebut sudah ada');

    const role = await this.prisma.client.orm.public.TenantCustomRole.create({
      tenantId,
      name,
      description: input.description?.trim() || null,
      isSystem: false,
    });

    await this.replacePermissions(role.id, input.permissions);
    return this.findOne(tenantId, role.id);
  }

  async findOne(tenantId: string, roleId: string) {
    const role = await this.prisma.client.orm.public.TenantCustomRole
      .where({ tenantId, id: roleId }).select('id','tenantId','name','description','isSystem').first();
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    const permissions = await this.prisma.client.orm.public.TenantRolePermission
      .where({ roleId }).select('id','module','canCreate','canRead','canUpdate','canDelete').all();
    return { ...role, permissions };
  }

  async update(tenantId: string, roleId: string, input: CreateTenantRoleInput) {
    const role = await this.findOne(tenantId, roleId);
    if (role.isSystem) throw new ForbiddenException('System role tidak dapat diubah');

    await this.prisma.client.orm.public.TenantCustomRole.where({ id: roleId }).update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
    });
    await this.replacePermissions(roleId, input.permissions);
    return this.findOne(tenantId, roleId);
  }

  async remove(tenantId: string, roleId: string) {
    const role = await this.findOne(tenantId, roleId);
    if (role.isSystem) throw new ForbiddenException('System role tidak dapat dihapus');

    const members = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, roleId }).select('id').all();
    if (members.length) throw new ConflictException('Role masih digunakan oleh member');

    await this.prisma.client.orm.public.TenantRolePermission.where({ roleId }).delete();
    await this.prisma.client.orm.public.TenantCustomRole.where({ id: roleId }).delete();
    return { message: 'Role berhasil dihapus' };
  }

  async replacePermissions(roleId: string, permissions: RolePermissionInput[]) {
    // A role may only have one permission row per module because of
    // the unique constraint (roleId, module). Normalize the payload first
    // so duplicate modules from the client cannot create duplicate rows.
    const uniquePermissions = new Map<PermissionModule, RolePermissionInput>();

    for (const permission of permissions) {
      if (!PERMISSION_MODULES.includes(permission.module)) {
        continue;
      }
      uniquePermissions.set(permission.module, permission);
    }

    // Replacement semantics: every permission module omitted by the client
    // must be explicitly revoked. Otherwise an old permission survives a role
    // update even though the administrator removed it from the payload.
    const existingPermissions = await this.prisma.client.orm.public.TenantRolePermission
      .where({ roleId })
      .select('id', 'module')
      .all();

    for (const existing of existingPermissions) {
      if (uniquePermissions.has(existing.module as PermissionModule)) continue;

      await this.prisma.client.orm.public.TenantRolePermission
        .where({ id: existing.id })
        .update({
          canCreate: false,
          canRead: false,
          canUpdate: false,
          canDelete: false,
        });
    }

    // Update existing rows and create missing rows instead of delete-all +
    // create-all, preserving the unique (roleId, module) invariant.
    for (const permission of uniquePermissions.values()) {
      const values = {
        canCreate: Boolean(permission.canCreate),
        canRead: Boolean(permission.canRead),
        canUpdate: Boolean(permission.canUpdate),
        canDelete: Boolean(permission.canDelete),
      };

      const existing = await this.prisma.client.orm.public.TenantRolePermission
        .where({ roleId, module: permission.module })
        .first();

      if (existing) {
        await this.prisma.client.orm.public.TenantRolePermission
          .where({ roleId, module: permission.module })
          .update(values);
        continue;
      }

      try {
        await this.prisma.client.orm.public.TenantRolePermission.create({
          roleId,
          module: permission.module,
          ...values,
        });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'sqlState' in error &&
          error.sqlState === '23505'
        ) {
          await this.prisma.client.orm.public.TenantRolePermission
            .where({ roleId, module: permission.module })
            .update(values);
          continue;
        }

        throw error;
      }
    }
  }

  async hasPermission(
    tenantId: string,
    userId: string,
    module: PermissionModule,
    action: PermissionAction,
  ) {
    const membership = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId }).select('role','roleId').first();
    if (!membership?.roleId) return false;

    const permission = await this.prisma.client.orm.public.TenantRolePermission
      .where({ roleId: membership.roleId, module }).first();
    if (!permission) return false;

    return Boolean(
      action === 'CREATE' ? permission.canCreate :
      action === 'READ' ? permission.canRead :
      action === 'UPDATE' ? permission.canUpdate :
      permission.canDelete,
    );
  }
}
