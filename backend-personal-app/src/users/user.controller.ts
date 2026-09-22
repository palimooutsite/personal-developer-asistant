import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService, UserResponse } from './user.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(
    @Body()
    body: {
      username: string;
      email: string;
      passwordHash: string;
      name?: string;
    },
  ): Promise<UserResponse> {
    return this.usersService.createUser(body);
  }

  @Get()
  async findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }
}