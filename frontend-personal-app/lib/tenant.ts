import { apiRequest } from './api';

const TENANT_KEY = 'pda_active_tenant_id';

export interface Tenant {
  id: string;
  name: string;
  createdBy: string;
  role: string;
}

export async function getTenants(): Promise<Tenant[]> {
  return apiRequest<Tenant[]>('/tenants');
}

export function getActiveTenantId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TENANT_KEY);
}

export function setActiveTenantId(tenantId: string): void {
  window.localStorage.setItem(TENANT_KEY, tenantId);
}

export function clearActiveTenantId(): void {
  window.localStorage.removeItem(TENANT_KEY);
}
