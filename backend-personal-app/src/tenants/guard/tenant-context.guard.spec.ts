import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { TenantContextGuard } from './tenant-context.guard.js';

describe('TenantContextGuard', () => {
  const tenantService = {
    getMembershipForContext: vi.fn(),
  };

  function createGuard() {
    tenantService.getMembershipForContext.mockReset();
    return new TenantContextGuard(tenantService as never);
  }

  function createContext(request: Record<string, unknown>) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never;
  }

  it('rejects requests without an authenticated user', async () => {
    const guard = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          user: undefined,
          headers: {},
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(
      tenantService.getMembershipForContext,
    ).not.toHaveBeenCalled();
  });

  it('rejects requests without X-Tenant-Id', async () => {
    const guard = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: 'user-1' },
          headers: {},
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      tenantService.getMembershipForContext,
    ).not.toHaveBeenCalled();
  });

  it('rejects users who are not members of the requested tenant', async () => {
    tenantService.getMembershipForContext.mockResolvedValue(null);

    const guard = createGuard();
    const request = {
      user: { userId: 'user-1' },
      headers: { 'x-tenant-id': 'tenant-2' },
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(
      tenantService.getMembershipForContext,
    ).toHaveBeenCalledWith('tenant-2', 'user-1');
  });

  it('attaches the verified tenant context for a valid member', async () => {
    tenantService.getMembershipForContext.mockResolvedValue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'ADMIN',
    });

    const guard = createGuard();
    const request = {
      user: { userId: 'user-1' },
      headers: { 'x-tenant-id': ' tenant-1 ' },
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).resolves.toBe(true);

    expect(request.tenant).toEqual({
      tenantId: 'tenant-1',
      role: 'ADMIN',
    });
  });
});
