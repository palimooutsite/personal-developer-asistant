import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';

export interface TenantListItem {
  id: string;
  name: string;
  createdBy: string;
  role: string;
}

export interface TenantResponse extends TenantListItem {}

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

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
}