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

  const refreshTenants = useCallback(async () => {
    if (pathname === '/login' || pathname === '/register') {
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
    }),
    [
      tenants,
      activeTenant,
      activeTenantId,
      loading,
      error,
      refreshTenants,
      selectTenant,
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
