import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CreateAuditLogInput {
  userId?: string | null;
  tenantId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogListItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  tenantId: string | null;
  workspaceName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    await this.prisma.client.orm.public.AuditLog.create({
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        description: input.description ?? null,
        metadata: input.metadata == null ? null : JSON.stringify(input.metadata),
        ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  async findAll(filters: { q?: string; action?: string; entity?: string; tenantId?: string; userId?: string } = {}) {
    const rows = await this.prisma.client.orm.public.AuditLog.all();
    const q = filters.q?.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (filters.action && row.action !== filters.action) return false;
      if (filters.entity && row.entity !== filters.entity) return false;
      if (filters.tenantId && row.tenantId !== filters.tenantId) return false;
      if (filters.userId && row.userId !== filters.userId) return false;
      if (!q) return true;
      return [row.action, row.entity, row.entityId ?? '', row.description ?? '', row.userId ?? '', row.tenantId ?? '', row.ipAddress ?? '']
        .join(' ').toLowerCase().includes(q);
    });

    const result: AuditLogListItem[] = [];
    for (const row of filtered) {
      const [user, tenant] = await Promise.all([
        row.userId ? this.prisma.client.orm.public.User.where({ id: row.userId }).select('id', 'name', 'email').first() : Promise.resolve(null),
        row.tenantId ? this.prisma.client.orm.public.Tenant.where({ id: row.tenantId }).select('id', 'name').first() : Promise.resolve(null),
      ]);
      result.push({
        id: row.id, userId: row.userId ?? null, userName: user?.name ?? null, userEmail: user?.email ?? null,
        tenantId: row.tenantId ?? null, workspaceName: tenant?.name ?? null, action: row.action, entity: row.entity,
        entityId: row.entityId ?? null, description: row.description ?? null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        ipAddress: row.ipAddress ?? null, userAgent: row.userAgent ?? null, createdAt: String(row.createdAt),
      });
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findOne(id: string) {
    return (await this.findAll()).find((item) => item.id === id) ?? null;
  }
}
