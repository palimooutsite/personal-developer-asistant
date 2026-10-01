import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthRequest } from '../types/auth-request.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException('Akses hanya untuk administrator platform');
    }

    return true;
  }
}
