export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_PREFIX = '/backend-api';
const TENANT_KEY = 'pda_active_tenant_id';

function isPublicPath(path: string): boolean {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path === '/tenants'
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('pda_access_token')
      : null;

  let activeTenantId =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(TENANT_KEY)
      : null;

  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (activeTenantId) {
    headers.set('X-Tenant-Id', activeTenantId);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const message =
      data && typeof data.message === 'string'
        ? data.message
        : 'Terjadi kesalahan pada API';

    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/register') &&
      window.location.pathname !== '/login'
    ) {
      window.localStorage.removeItem('pda_access_token');
      window.localStorage.removeItem(TENANT_KEY);
      window.location.replace('/login');
    }

    throw new ApiError(response.status, message);
  }

  return data as T;
}
