'use client';

import { useTenant } from './TenantProvider';

export function TenantSwitcher() {
  const {
    tenants,
    activeTenantId,
    loading,
    error,
    selectTenant,
  } = useTenant();

  if (loading) {
    return (
      <div className="h-10 w-52 animate-pulse rounded-xl bg-zinc-100" />
    );
  }

  if (error || tenants.length === 0) {
    return null;
  }

  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        Workspace
      </span>
      <select
        value={activeTenantId ?? ''}
        onChange={(event) => selectTenant(event.target.value)}
        className="min-w-0 bg-transparent text-sm font-semibold text-zinc-800 outline-none"
        aria-label="Pilih workspace"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name} · {tenant.role}
          </option>
        ))}
      </select>
    </label>
  );
}
