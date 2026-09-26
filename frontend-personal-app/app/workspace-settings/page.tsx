'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import {
  addTenantMember,
  getTenantMembers,
  removeTenantMember,
  updateTenant,
  updateTenantMemberRole,
  type TenantMember,
} from '../../../lib/tenant';
import { searchUsers, type UserPickerItem } from '../../../lib/users';
import { useTenant } from '../../../components/providers/TenantProvider';
import { ModuleHeader } from '../../../components/layout/ModuleHeader';

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const { activeTenant, loading: tenantLoading, refreshTenants } = useTenant();
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserPickerItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPickerItem | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  const canManage = activeTenant?.role === 'OWNER' || activeTenant?.role === 'ADMIN';

  async function loadMembers() {
    if (!activeTenant) return;

    setMembersLoading(true);
    setError('');
    try {
      setMembers(await getTenantMembers(activeTenant.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Gagal memuat member.');
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    setWorkspaceName(activeTenant?.name ?? '');
    void loadMembers();
  }, [activeTenant?.id, activeTenant?.name]);

  useEffect(() => {
    if (!canManage || !activeTenant || !search.trim()) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await searchUsers(
          search,
          1,
          10,
          members.map((member) => member.userId),
        );
        setResults(response.data);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, canManage, activeTenant?.id, members]);

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTenant || !canManage || !workspaceName.trim()) return;

    setSaving(true);
    setError('');
    try {
      await updateTenant(activeTenant.id, workspaceName.trim());
      await refreshTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui workspace.');
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTenant || !canManage || !selectedUser) return;

    setSaving(true);
    setError('');
    try {
      const member = await addTenantMember(activeTenant.id, selectedUser.id, role);
      setMembers((current) => [...current, member]);
      setSelectedUser(null);
      setSearch('');
      setResults([]);
      setRole('MEMBER');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengundang member.');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(member: TenantMember, nextRole: 'ADMIN' | 'MEMBER') {
    if (!activeTenant || !canManage || member.role === 'OWNER') return;

    setSaving(true);
    setError('');
    try {
      const updated = await updateTenantMemberRole(
        activeTenant.id,
        member.userId,
        nextRole,
      );
      setMembers((current) =>
        current.map((item) => item.userId === updated.userId ? updated : item),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role.');
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: TenantMember) {
    if (!activeTenant || !canManage || member.role === 'OWNER') return;

    if (!window.confirm(`Hapus "${member.user.name || member.user.username}" dari workspace?`)) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await removeTenantMember(activeTenant.id, member.userId);
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus member.');
    } finally {
      setSaving(false);
    }
  }

  if (tenantLoading || !activeTenant) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200" />
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-10">
        <ModuleHeader
          icon="⚙"
          label="SETTINGS"
          title="Workspace Settings"
          subtitle={activeTenant.name}
          description="Kelola informasi workspace dan anggota yang memiliki akses."
          accent="cyan"
        />

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            General
          </p>
          <h2 className="mt-1 text-xl font-bold">Informasi Workspace</h2>
          <p className="mt-1 text-sm text-zinc-500">Perbarui nama workspace.</p>

          {canManage ? (
            <form onSubmit={saveWorkspace} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                maxLength={100}
                required
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={saving || !workspaceName.trim()}
                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Simpan Perubahan
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-sm font-semibold">
              {activeTenant.name}
              <span className="ml-2 text-xs font-medium text-zinc-400">Role: {activeTenant.role}</span>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Members</p>
            <h2 className="mt-1 text-xl font-bold">Invite & Manage Members</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Tambahkan user yang sudah terdaftar ke workspace ini.
            </p>
          </div>

          {canManage ? (
            <form onSubmit={inviteMember} className="border-b border-zinc-100 bg-zinc-50 p-5 sm:p-6">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto]">
                <div className="relative">
                  <input
                    value={selectedUser ? selectedUser.name || selectedUser.username : search}
                    onChange={(event) => {
                      setSelectedUser(null);
                      setSearch(event.target.value);
                    }}
                    placeholder="Cari username, nama, atau email..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                  />
                  {!selectedUser && results.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                      {results.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setSearch('');
                            setResults([]);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-700">
                            {(user.name || user.username).charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{user.name || user.username}</span>
                            <span className="block truncate text-xs text-zinc-400">@{user.username} · {user.email}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as 'ADMIN' | 'MEMBER')}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold"
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>

                <button
                  type="submit"
                  disabled={saving || !selectedUser}
                  className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
                >
                  Invite Member
                </button>
              </div>
              {selectedUser ? (
                <p className="mt-2 text-xs text-zinc-500">
                  User terpilih: <span className="font-semibold">{selectedUser.name || selectedUser.username}</span>
                </p>
              ) : null}
            </form>
          ) : (
            <div className="bg-zinc-50 px-5 py-4 text-sm text-zinc-500 sm:px-6">
              Hanya OWNER atau ADMIN yang dapat mengelola member.
            </div>
          )}

          <div className="p-5 sm:p-6">
            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-zinc-100" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                        {(member.user.name || member.user.username).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{member.user.name || member.user.username}</p>
                        <p className="truncate text-xs text-zinc-400">@{member.user.username} · {member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.role === 'OWNER' ? (
                        <span className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white">OWNER</span>
                      ) : canManage ? (
                        <>
                          <select
                            value={member.role}
                            disabled={saving}
                            onChange={(event) => void changeRole(member, event.target.value as 'ADMIN' | 'MEMBER')}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void removeMember(member)}
                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        </>
                      ) : (
                        <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">{member.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
