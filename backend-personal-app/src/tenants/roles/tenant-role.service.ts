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

  async ensureSystemRoles(tenantId: string): Promise<TenantCustomRoleRow> {
    const owner = await this.prisma.client.orm.public.TenantCustomRole
      .where({ tenantId, name: 'Owner' }).first();
    if (owner) return owner;

    const role = await this.prisma.client.orm.public.TenantCustomRole.create({
      tenantId,
      name: 'Owner',
      description: 'System role dengan akses penuh workspace.',
      isSystem: true,
    });

    for (const permission of this.fullPermissions()) {
      await this.prisma.client.orm.public.TenantRolePermission.create({
        roleId: role.id,
        ...permission,
      });
    }
    return role;
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
    await this.prisma.client.orm.public.TenantRolePermission.where({ roleId }).delete();
    for (const permission of permissions) {
      await this.prisma.client.orm.public.TenantRolePermission.create({
        roleId,
        module: permission.module,
        canCreate: Boolean(permission.canCreate),
        canRead: Boolean(permission.canRead),
        canUpdate: Boolean(permission.canUpdate),
        canDelete: Boolean(permission.canDelete),
      });
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
    if (!membership) return false;
    if (membership.role === 'OWNER') return true;
    if (!membership.roleId) return true;

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
