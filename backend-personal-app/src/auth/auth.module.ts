import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersModule } from '../users/user.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    UsersModule,
    AuditModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    JwtStrategy,
  ],

  exports: [
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}