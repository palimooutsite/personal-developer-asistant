import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/user.service.js';


export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  name?: string;
}

export interface RegisterUserResponse {
  id: string;
  username: string;
  email: string;
  name: string | null;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    data: RegisterUserInput,
  ): Promise<RegisterUserResponse> {
    const passwordHash = await argon2.hash(data.password);

    const user = await this.usersService.createUser({
      username: data.username,
      email: data.email,
      passwordHash,
      name: data.name,
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    };
  }

  async updateProfile(userId: string, data: { name?: string }): Promise<RegisterUserResponse & { avatarUrl: string | null }> {
    const user = await this.usersService.updateProfile(userId, data);
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) throw new UnauthorizedException('User tidak ditemukan');
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Password saat ini salah');
    const passwordHash = await argon2.hash(newPassword);
    await this.usersService.updatePassword(userId, passwordHash);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<RegisterUserResponse & { avatarUrl: string | null }> {
    return this.usersService.updateAvatar(userId, avatarUrl);
  }

  async removeAvatar(userId: string): Promise<RegisterUserResponse & { avatarUrl: string | null }> {
    return this.usersService.updateAvatar(userId, '');
  }

  async login(
  data: LoginUserInput,
): Promise<LoginUserResponse> {
  const user = await this.usersService.findByEmail(
    data.email,
  );

  if (!user) {
    throw new UnauthorizedException(
      'Email atau password salah',
    );
  }

  const passwordValid = await argon2.verify(
    user.passwordHash,
    data.password,
  );

  if (!passwordValid) {
    throw new UnauthorizedException(
      'Username atau password salah',
    );
  }

  const payload = {
    sub: user.id,
    username: user.username,
  };

  const accessToken = await this.jwtService.signAsync(
    payload,
  );

  return {
    accessToken,
  };
}
}