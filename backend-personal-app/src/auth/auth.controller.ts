import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import type {
  RegisterUserResponse,
  LoginUserResponse,
} from './auth.service.js';

import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guard/jwt-auth.guard.js';
import type { AuthRequest } from './types/auth-request.js';
import { UsersService } from '../users/user.service.js';

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
async me(
  @Req() req: AuthRequest,
) {
  return this.usersService.findById(req.user.userId);
}
}
