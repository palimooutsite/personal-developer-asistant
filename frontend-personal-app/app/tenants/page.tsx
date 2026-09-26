'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import {
  addTenantMember,
  createTenant,
  getTenantMembers,
  removeTenantMember,
  TenantMember,
  updateTenant,
  updateTenantMemberRole,
} from '../../lib/tenant';
import { searchUsers, UserPickerItem } from '../../lib/users';
import { useTenant } from '../../components/providers/TenantProvider';
import { ModuleHeader } from '../../components/layout/ModuleHeader';

export default function TenantsPage() {
  const router = useRouter();
  const {
    tenants,
    activeTenant,
    loading: tenantLoading,
    refreshTenants,
  } = useTenant();

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [search, setSearch] = useState('');
  const [userResults, setUserResults] = useState<UserPickerItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPickerItem | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  const canManage = activeTenant?.role === 'OWNER' || activeTenant?.role === 'ADMIN';
  const canEditTenant = activeTenant?.role === 'OWNER' || activeTenant?.role === 'ADMIN';

  async function loadMembers() {
    if (!activeTenant) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);
    try {
      setMembers(await getTenantMembers(activeTenant.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat member workspace.');
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [activeTenant?.id]);

  useEffect(() => {
    if (!canManage) {
      setUserResults([]);
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
        setUserResults(response.data);
      } catch {
        setUserResults([]);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, canManage, members]);

  useEffect(() => {
    setEditingName(activeTenant?.name ?? '');
    setName(activeTenant?.name ?? '');
  }, [activeTenant?.id, activeTenant?.name]);

  async function handleUpdateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeTenant || !canEditTenant || !editingName.trim()) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateTenant(activeTenant.id, editingName.trim());
      await refreshTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui workspace.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newTenantName.trim()) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tenant = await createTenant(newTenantName.trim());
      setNewTenantName('');
      await refreshTenants();
      window.localStorage.setItem('pda_active_tenant_id', tenant.id);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat workspace.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeTenant || !selectedUser || !canManage) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const member = await addTenantMember(
        activeTenant.id,
        selectedUser.id,
        newMemberRole,
      );
      setMembers((current) => [...current, member]);
      setSelectedUser(null);
      setSearch('');
      setUserResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(member: TenantMember, role: 'ADMIN' | 'MEMBER') {
    if (!activeTenant || !canManage) return;

    setSaving(true);
    setError('');

    try {
      const updated = await updateTenantMemberRole(
        activeTenant.id,
        member.userId,
        role,
      );
      setMembers((current) =>
        current.map((item) => item.userId === updated.userId ? updated : item),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(member: TenantMember) {
    if (!activeTenant || !canManage) return;

    if (
      !window.confirm(
        `Hapus "${member.user.name || member.user.username}" dari workspace?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await removeTenantMember(activeTenant.id, member.userId);
      setMembers((current) =>
        current.filter((item) => item.userId !== member.userId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus member.');
    } finally {
      setSaving(false);
    }
  }

  if (tenantLoading) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200" />
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-10">
        <ModuleHeader
          icon="⌂"
          label="WORKSPACE"
          title="Workspace & Members"
          subtitle="Tenant Management"
          description="Kelola workspace aktif dan anggota yang memiliki akses ke data workspace."
          accent="cyan"
        />

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Workspace Aktif
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {activeTenant?.name ?? 'Belum ada workspace'}
                  </h2>
                </div>
                {activeTenant ? (
                  <span className="w-fit rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white">
                    {activeTenant.role}
                  </span>
                ) : null}
              </div>
            </div>

            {activeTenant ? (
              <div className="p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-400">Workspace ID</p>
                    <p className="mt-1 truncate text-xs font-semibold text-zinc-700">{activeTenant.id}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-400">Role Saya</p>
                    <p className="mt-1 text-sm font-bold">{activeTenant.role}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-400">Total Workspace</p>
                    <p className="mt-1 text-sm font-bold">{tenants.length}</p>
                  </div>
                </div>

                {canEditTenant ? (
                  <form onSubmit={handleUpdateTenant} className="mt-6 rounded-xl border border-zinc-200 p-4">
                    <p className="text-sm font-semibold">Nama Workspace</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        maxLength={100}
                        required
                        className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
                      />
                      <button
                        type="submit"
                        disabled={saving || !editingName.trim()}
                        className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="p-6 text-sm text-zinc-500">
                Kamu belum memiliki workspace. Buat workspace baru dari panel sebelah.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Workspace Baru
            </p>
            <h2 className="mt-1 text-lg font-bold">Buat Workspace</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Workspace baru akan langsung membuat kamu sebagai OWNER.
            </p>

            <form onSubmit={handleCreateTenant} className="mt-5 space-y-3">
              <input
                value={newTenantName}
                onChange={(event) => setNewTenantName(event.target.value)}
                maxLength={100}
                required
                placeholder="Contoh: Personal Development"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={saving || !newTenantName.trim()}
                className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
              >
                {saving ? 'Membuat...' : 'Buat Workspace'}
              </button>
            </form>
          </section>
        </div>

        {activeTenant ? (
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Members
                </p>
                <h2 className="mt-1 text-xl font-bold">Anggota Workspace</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Kelola siapa yang dapat mengakses workspace ini.
                </p>
              </div>
            </div>

            {canManage ? (
              <form onSubmit={handleAddMember} className="border-b border-zinc-100 bg-zinc-50 p-5 sm:p-6">
                <p className="text-sm font-semibold">Tambah Member</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
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
                    {!selectedUser && userResults.length > 0 ? (
                      <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
                        {userResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setSearch('');
                              setUserResults([]);
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
                    value={newMemberRole}
                    onChange={(event) => setNewMemberRole(event.target.value as 'ADMIN' | 'MEMBER')}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>

                  <button
                    type="submit"
                    disabled={saving || !selectedUser}
                    className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Tambah
                  </button>
                </div>
                {selectedUser ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Dipilih: <span className="font-semibold">{selectedUser.name || selectedUser.username}</span>
                  </p>
                ) : null}
              </form>
            ) : null}

            <div className="p-5 sm:p-6">
              {membersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-xl bg-zinc-100" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400">
                  Belum ada member.
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isOwner = member.role === 'OWNER';

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                            {(member.user.name || member.user.username).charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {member.user.name || member.user.username}
                            </p>
                            <p className="truncate text-xs text-zinc-400">
                              @{member.user.username} · {member.user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOwner ? (
                            <span className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white">
                              OWNER
                            </span>
                          ) : canManage ? (
                            <>
                              <select
                                value={member.role}
                                disabled={saving}
                                onChange={(event) =>
                                  void handleRoleChange(
                                    member,
                                    event.target.value as 'ADMIN' | 'MEMBER',
                                  )
                                }
                                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="MEMBER">MEMBER</option>
                              </select>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void handleRemoveMember(member)}
                                className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </>
                          ) : (
                            <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
