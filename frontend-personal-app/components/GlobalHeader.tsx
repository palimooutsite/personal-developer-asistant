'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from './providers/TenantProvider';
import { getCurrentUser, logout } from '../lib/auth';

export function GlobalHeader() {
  const pathname = usePathname();
  const { tenants, activeTenant, loading, selectTenant, can } = useTenant();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    if (
      pathname === '/' ||
      pathname === '/landing' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/workspace-selection' ||
      pathname === '/invitations/accept' ||
      pathname === '/billing/plans'
    ) {
      setIsPlatformAdmin(false);
      return;
    }

    let mounted = true;
    void getCurrentUser()
      .then((user) => {
        if (mounted) setIsPlatformAdmin(user.isPlatformAdmin);
      })
      .catch(() => {
        if (mounted) setIsPlatformAdmin(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/workspace-selection' ||
    pathname === '/invitations/accept' ||
    pathname === '/landing' ||
    pathname === '/billing/plans'
  ) {
    return null;
  }

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 2xl:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white">
            PDA
          </span>
          <span className="hidden text-sm font-bold text-zinc-900 sm:block">
            Personal Developer Assistant
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="hidden rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 sm:inline-flex"
          >
            Billing
          </Link>

          {isPlatformAdmin ? (
            <Link
              href="/admin/billing"
              className="hidden rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 sm:inline-flex"
            >
              Platform Billing
            </Link>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceOpen((open) => !open)}
              disabled={loading || tenants.length === 0}
              aria-haspopup="menu"
              aria-expanded={workspaceOpen}
              className="inline-flex min-w-0 max-w-[240px] items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left transition hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-sm font-bold text-cyan-700">
                {activeTenant?.name?.charAt(0).toUpperCase() ?? 'W'}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Workspace
                </span>
                <span className="block truncate text-sm font-semibold text-zinc-800">
                  {loading ? 'Memuat...' : activeTenant?.name ?? 'Pilih workspace'}
                </span>
              </span>
              <span className={'ml-1 text-xs text-zinc-400 transition-transform ' + (workspaceOpen ? 'rotate-180' : '')}>
                ⌄
              </span>
            </button>

            {workspaceOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Tutup pilihan workspace"
                  className="fixed inset-0 z-40 h-screen w-screen cursor-default"
                  onClick={() => setWorkspaceOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl" role="menu">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspace</p>
                    <p className="mt-1 text-xs text-zinc-500">Pilih workspace yang sedang kamu kerjakan.</p>
                  </div>

                  <div className="mt-1 max-h-72 overflow-y-auto">
                    {tenants.map((tenant) => {
                      const active = tenant.id === activeTenant?.id;
                      return (
                        <button
                          key={tenant.id}
                          type="button"
                          onClick={() => {
                            setWorkspaceOpen(false);
                            if (!active) selectTenant(tenant.id, true);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                          role="menuitem"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-sm font-bold text-cyan-700">
                            {tenant.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900">{tenant.name}</span>
                            <span className="block text-xs text-zinc-500">{tenant.role}</span>
                          </span>
                          {active ? <span className="text-sm font-bold text-cyan-600">✓</span> : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1 border-t border-zinc-100 pt-1">
                    {can('WORKSPACE_SETTINGS') ? (
                      <Link
                        href="/workspace-settings"
                        onClick={() => setWorkspaceOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                      >
                        <span>⚙</span>
                        Kelola Workspace
                      </Link>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={settingsOpen}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <span>⚙</span>
              <span>Settings</span>
              <span className={'text-xs transition-transform ' + (settingsOpen ? 'rotate-180' : '')}>⌄</span>
            </button>

            {settingsOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Tutup menu settings"
                  className="fixed inset-0 z-40 h-screen w-screen cursor-default"
                  onClick={() => setSettingsOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl" role="menu">
                  {can('WORKSPACE_SETTINGS') ? (
                    <Link
                      href="/workspace-settings"
                      onClick={() => setSettingsOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-zinc-50"
                      role="menuitem"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">▣</span>
                      <span>
                        <span className="block font-semibold text-zinc-900">Workspace Settings</span>
                        <span className="block text-xs text-zinc-500">Workspace, anggota & role</span>
                      </span>
                    </Link>
                  ) : null}

                  <Link
                    href="/account-settings"
                    onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-zinc-50"
                    role="menuitem"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">◉</span>
                    <span>
                      <span className="block font-semibold text-zinc-900">Account Settings</span>
                      <span className="block text-xs text-zinc-500">Profil, foto & keamanan</span>
                    </span>
                  </Link>

                  {isPlatformAdmin ? (
                    <>
                      <div className="my-1 border-t border-zinc-100" />
                      <Link
                        href="/admin/billing"
                        onClick={() => setSettingsOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:bg-amber-50"
                        role="menuitem"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">▤</span>
                        <span>
                          <span className="block font-semibold text-zinc-900">Platform Billing</span>
                          <span className="block text-xs text-zinc-500">Package, feature, harga & discount</span>
                        </span>
                      </Link>
                    </>
                  ) : null}

                  <div className="my-1 border-t border-zinc-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-red-50"
                    role="menuitem"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">↪</span>
                    <span>
                      <span className="block font-semibold text-red-700">Logout</span>
                      <span className="block text-xs text-zinc-500">Keluar dari akun</span>
                    </span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
