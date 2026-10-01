import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

export interface UserWithPassword extends UserResponse {
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: { username: string; email: string; passwordHash: string; name?: string }): Promise<UserWithPassword> {
    const user = await this.prisma.client.orm.public.User.create({
      username: data.username, email: data.email, passwordHash: data.passwordHash, name: data.name,
    });
    return {
      id: user.id, username: user.username, email: user.email, name: user.name,
      avatarUrl: user.avatarUrl, passwordHash: user.passwordHash, isPlatformAdmin: user.isPlatformAdmin,
    };
  }

  async findAll(): Promise<UserResponse[]> {
    return this.prisma.client.orm.public.User.select(
      'id', 'username', 'email', 'name', 'avatarUrl', 'isPlatformAdmin', 'createdAt', 'updatedAt',
    ).all();
  }

  async searchUsers(tenantId: string, currentUserId: string, search?: string, page = 1, limit = 5, excludeUserIds: string[] = []) {
    const membership = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId, userId: currentUserId }).select('role').first();

    if (!membership) throw new ForbiddenException('Anda bukan member workspace ini');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('Anda tidak memiliki izin untuk mencari user');
    }

    const tenantMembers = await this.prisma.client.orm.public.TenantMember
      .where({ tenantId }).select('userId').all();
    const workspaceMemberIds = new Set(tenantMembers.map((member) => member.userId));
    const users = (await this.findAll()).filter((user) => !workspaceMemberIds.has(user.id));
    const keyword = search?.trim().toLowerCase();
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(10, Math.max(1, limit));
    const excludedIds = new Set(excludeUserIds);
    const filtered = (keyword
      ? users.filter((user) => [user.username, user.email, user.name ?? ''].some((value) => value.toLowerCase().includes(keyword)))
      : users).filter((user) => !excludedIds.has(user.id));

    const total = filtered.length;
    const totalPages = Math.ceil(total / normalizedLimit);
    const safePage = totalPages > 0 ? Math.min(normalizedPage, totalPages) : 1;
    const start = (safePage - 1) * normalizedLimit;

    return { data: filtered.slice(start, start + normalizedLimit), meta: { page: safePage, limit: normalizedLimit, total, totalPages } };
  }

  async findByEmail(email: string) {
    return this.prisma.client.orm.public.User.where({ email: email.trim().toLowerCase() })
      .select('id', 'username', 'email', 'passwordHash', 'name', 'isPlatformAdmin').first();
  }

  async findById(id: string): Promise<UserResponse | null> {
    const user = await this.prisma.client.orm.public.User
      .where({ id })
      .select('id', 'username', 'email', 'name', 'avatarUrl', 'isPlatformAdmin')
      .first();

    if (!user) return null;

    return {
      id: user.id, username: user.username, email: user.email, name: user.name,
      avatarUrl: user.avatarUrl, isPlatformAdmin: user.isPlatformAdmin,
    };
  }

  async findByIdWithPassword(id: string): Promise<UserWithPassword | null> {
    return this.prisma.client.orm.public.User
      .where({ id })
      .select('id', 'username', 'email', 'name', 'avatarUrl', 'passwordHash', 'isPlatformAdmin')
      .first();
  }

  async updateProfile(id: string, data: { name?: string }): Promise<UserResponse & { avatarUrl: string | null }> {
    await this.prisma.client.orm.public.User.where({ id }).update({ name: data.name?.trim() || null });
    const user = await this.findById(id);
    if (!user) throw new Error('User tidak ditemukan');
    return user;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.client.orm.public.User.where({ id }).update({ passwordHash });
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<UserResponse & { avatarUrl: string | null }> {
    await this.prisma.client.orm.public.User.where({ id }).update({ avatarUrl });
    const user = await this.findById(id);
    if (!user) throw new Error('User tidak ditemukan');
    return user;
  }
}
