import { SetMetadata } from '@nestjs/common';
import type { PermissionAction, PermissionModule } from './permission.constants.js';

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (
  module: PermissionModule,
  action: PermissionAction,
) => SetMetadata(PERMISSION_KEY, { module, action });
