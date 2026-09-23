import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  name: string | null;
}

export interface UserWithPassword extends UserResponse {
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<UserWithPassword> {
    const user = await this.prisma.client.orm.public.User.create({
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash
    };
  }

  async findAll(): Promise<UserResponse[]> {
    return this.prisma.client.orm.public.User.select(
      'id',
      'username',
      'email',
      'name',
      'createdAt',
      'updatedAt',
    ).all();
  }

  async searchUsers(
    search?: string,
    page = 1,
    limit = 5,
  ): Promise<{
    data: UserResponse[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const users = await this.findAll();
    const keyword = search?.trim().toLowerCase();
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(10, Math.max(1, limit));

    const filtered = keyword
      ? users.filter((user) =>
          [user.username, user.email, user.name ?? '']
            .some((value) => value.toLowerCase().includes(keyword)),
        )
      : users;

    const total = filtered.length;
    const totalPages = Math.ceil(total / normalizedLimit);
    const safePage = totalPages > 0
      ? Math.min(normalizedPage, totalPages)
      : 1;
    const start = (safePage - 1) * normalizedLimit;

    return {
      data: filtered.slice(start, start + normalizedLimit),
      meta: {
        page: safePage,
        limit: normalizedLimit,
        total,
        totalPages,
      },
    };
  }
  async findByUsername(username: string) {
    return this.prisma.client.orm.public.User.where({
      username,
    })
      .select('id', 'username', 'email', 'passwordHash', 'name')
      .first();
  }
  async findById(
  id: string,
): Promise<UserResponse | null> {
  const user = await this.prisma.client.orm.public.User
    .where({
      id,
    })
    .select(
      'id',
      'username',
      'email',
      'name',
    )
    .first();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
  };
}
}
