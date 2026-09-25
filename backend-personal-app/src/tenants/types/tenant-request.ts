import type { Request } from 'express';

export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface TenantRequest extends Request {
  user: {
    userId: string;
    username: string;
  };
  tenant: {
    tenantId: string;
    role: TenantRole;
  };
}
