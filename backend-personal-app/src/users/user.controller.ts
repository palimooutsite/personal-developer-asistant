import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard.js';
import { UsersService } from './user.service.js';
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async createUser(
    @Body()
    body: {
      username: string;
      email: string;
      passwordHash: string;
      name?: string;
    },
  ) {
    return this.usersService.createUser(body);
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  async search(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '5',
  ) {
    return this.usersService.searchUsers(
      search,
      Number(page),
      Number(limit),
    );
  }
}