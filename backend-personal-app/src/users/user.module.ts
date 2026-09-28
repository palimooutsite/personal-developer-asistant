import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from './user.controller.js';
import { UsersService } from './user.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantModule } from '../tenants/tenant.module.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    TenantModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
