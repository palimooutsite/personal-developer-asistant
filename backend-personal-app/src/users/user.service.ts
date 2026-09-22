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
      'passwordHash',
      'name',
      'createdAt',
      'updatedAt',
    ).all();
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
