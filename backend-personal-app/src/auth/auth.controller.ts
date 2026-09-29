import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync, unlink } from 'node:fs';
import { diskStorage } from 'multer';

import { AuthService } from './auth.service.js';
import type { RegisterUserResponse, LoginUserResponse } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import type { AuthRequest } from './types/auth-request.js';
import { UsersService } from '../users/user.service.js';

const avatarDirectory = 'uploads/avatars';
mkdirSync(avatarDirectory, { recursive: true });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto): Promise<RegisterUserResponse> {
    return this.authService.register({
      username: body.username,
      email: body.email,
      password: body.password,
      name: body.name,
    });
  }

  @Post('login')
  async login(@Body() body: LoginDto): Promise<LoginUserResponse> {
    return this.authService.login({
      username: body.username,
      password: body.password,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthRequest) {
    return this.usersService.findById(req.user.userId);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() body: { name?: string },
  ) {
    return this.authService.updateProfile(req.user.userId, {
      name: body.name,
    });
  }

  @Post('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: AuthRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword || body.newPassword.length < 8) {
      throw new BadRequestException('Password baru minimal 8 karakter');
    }
    await this.authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
    return { message: 'Password berhasil diubah' };
  }

  @Post('avatar/remove')
  @UseGuards(JwtAuthGuard)
  async removeAvatar(@Req() req: AuthRequest) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    if (user.avatarUrl?.startsWith('/backend-api/uploads/avatars/')) {
      const filename = user.avatarUrl.split('/').pop();
      if (filename) {
        await new Promise<void>((resolve) => {
          unlink('uploads/avatars/' + filename, () => resolve());
        });
      }
    }

    return this.authService.removeAvatar(req.user.userId);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: avatarDirectory,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
      },
    }),
  )
  async uploadAvatar(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Foto harus berupa JPG, PNG, atau WebP maksimal 2 MB');
    }
    return this.authService.updateAvatar(
      req.user.userId,
      `/backend-api/uploads/avatars/${file.filename}`,
    );
  }
}
