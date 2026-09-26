import { apiRequest } from './api';

const TENANT_KEY = 'pda_active_tenant_id';

export interface Tenant {
  id: string;
  name: string;
  createdBy: string;
  role: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    email: string;
    name: string | null;
  };
}

export async function getTenants(): Promise<Tenant[]> {
  return apiRequest<Tenant[]>('/tenants');
}

export async function createTenant(name: string): Promise<Tenant> {
  return apiRequest<Tenant>('/tenants', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateTenant(
  tenantId: string,
  name: string,
): Promise<Tenant> {
  return apiRequest<Tenant>(`/tenants/${tenantId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function getTenantMembers(
  tenantId: string,
): Promise<TenantMember[]> {
  return apiRequest<TenantMember[]>(`/tenants/${tenantId}/members`);
}

export async function addTenantMember(
  tenantId: string,
  userId: string,
  role: 'ADMIN' | 'MEMBER',
): Promise<TenantMember> {
  return apiRequest<TenantMember>(`/tenants/${tenantId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId, role }),
  });
}

export async function updateTenantMemberRole(
  tenantId: string,
  userId: string,
  role: 'ADMIN' | 'MEMBER',
): Promise<TenantMember> {
  return apiRequest<TenantMember>(
    `/tenants/${tenantId}/members/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
}

export async function removeTenantMember(
  tenantId: string,
  userId: string,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/tenants/${tenantId}/members/${userId}`,
    { method: 'DELETE' },
  );
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
