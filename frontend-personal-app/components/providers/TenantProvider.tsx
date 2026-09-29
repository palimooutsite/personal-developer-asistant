'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import {
  clearActiveTenantId,
  getActiveTenantId,
  getTenants,
  getTenantPermissions,
  type PermissionModule,
  type TenantPermission,
  setActiveTenantId,
  type Tenant,
} from '../../lib/tenant';

interface TenantContextValue {
  tenants: Tenant[];
  activeTenant: Tenant | null;
  activeTenantId: string | null;
  loading: boolean;
  error: string | null;
  refreshTenants: () => Promise<void>;
  selectTenant: (tenantId: string, redirect?: boolean) => void;
  permissions: TenantPermission[];
  permissionLoading: boolean;
  can: (module: PermissionModule, action?: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') => boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

const SELECTION_PATH = '/workspace-selection';

export function TenantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<TenantPermission[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);

  const refreshTenants = useCallback(async () => {
    if (
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/invitations/accept' ||
      pathname === '/landing'
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTenants();
      setTenants(result);

      const storedTenantId = getActiveTenantId();
      const storedTenantExists = result.some(
        (tenant) => tenant.id === storedTenantId,
      );

      const nextTenantId = storedTenantExists ? storedTenantId : null;

      if (nextTenantId) {
        setActiveTenantId(nextTenantId);
      } else {
        clearActiveTenantId();
      }

      setActiveTenantIdState(nextTenantId);

      if (nextTenantId) {
        setPermissionLoading(true);
        try {
          const permissionResult = await getTenantPermissions(nextTenantId);
          setPermissions(permissionResult.permissions);
        } catch {
          setPermissions([]);
        } finally {
          setPermissionLoading(false);
        }
      } else {
        setPermissions([]);
        setPermissionLoading(false);
      }

      if (
        result.length === 0 &&
        pathname !== SELECTION_PATH &&
        pathname !== '/tenants'
      ) {
        router.replace(SELECTION_PATH);
      } else if (
        result.length > 0 &&
        !nextTenantId &&
        pathname !== SELECTION_PATH
      ) {
        router.replace(SELECTION_PATH);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearActiveTenantId();
        setActiveTenantIdState(null);
        setTenants([]);
      }

      setError(
        err instanceof ApiError
          ? err.message
          : 'Workspace tidak dapat dimuat.',
      );
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    void refreshTenants();
  }, [refreshTenants]);

  const selectTenant = useCallback(
    (tenantId: string, redirect = true) => {
      const tenant = tenants.find((item) => item.id === tenantId);

      if (!tenant) {
        return;
      }

      setActiveTenantId(tenantId);
      setActiveTenantIdState(tenantId);

      if (redirect) {
        router.push('/');
      }
    },
    [router, tenants],
  );

  const can = useCallback(
    (
      module: PermissionModule,
      action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' = 'READ',
    ) => {
      const permission = permissions.find((item) => item.module === module);
      if (!permission) return false;
      if (action === 'CREATE') return permission.canCreate;
      if (action === 'UPDATE') return permission.canUpdate;
      if (action === 'DELETE') return permission.canDelete;
      return permission.canRead;
    },
    [permissions],
  );

  const activeTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === activeTenantId) ?? null,
    [activeTenantId, tenants],
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      tenants,
      activeTenant,
      activeTenantId,
      loading,
      error,
      refreshTenants,
      selectTenant,
      permissions,
      permissionLoading,
      can,
    }),
    [
      tenants,
      activeTenant,
      activeTenantId,
      loading,
      error,
      refreshTenants,
      selectTenant,
      permissions,
      permissionLoading,
      can,
    ],
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used inside TenantProvider');
  }

  return context;
}
