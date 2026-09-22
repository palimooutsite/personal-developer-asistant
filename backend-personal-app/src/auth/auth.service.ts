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
  username: string;
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

  async login(
  data: LoginUserInput,
): Promise<LoginUserResponse> {
  const user = await this.usersService.findByUsername(
    data.username,
  );

  if (!user) {
    throw new UnauthorizedException(
      'Username atau password salah',
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