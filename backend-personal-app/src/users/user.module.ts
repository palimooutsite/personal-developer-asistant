import { Module } from '@nestjs/common';
import { UsersController } from './user.controller.js';
import { UsersService } from './user.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}