import type { AuthRequest } from '../../auth/types/auth-request.js';

export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface TenantRequest extends AuthRequest {
  tenant: {
    tenantId: string;
    role: TenantRole;
  };
}
