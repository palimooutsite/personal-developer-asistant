'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTenantInvitation,
  deleteTenantRole,
  getTenantMembers,
  getTenantRoles,
  removeTenantMember,
  TenantMember,
  TenantRole,
  updateTenant,
  updateTenantMemberRole,
  createTenantRole,
  updateTenantRole,
  PermissionModule,
  RolePermissionInput,
} from '@/lib/tenant';
import { useTenant } from '@/components/providers/TenantProvider';
import { ApiError } from '@/lib/api';
import { ModuleHeader } from '@/components/layout/ModuleHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: 'DASHBOARD', label: 'Dashboard' },
  { key: 'PROJECTS', label: 'Projects' },
  { key: 'TASKS', label: 'Tasks' },
  { key: 'KNOWLEDGE', label: 'Knowledge' },
  { key: 'CODE_SNIPPETS', label: 'Code Snippets' },
  { key: 'DOCUMENTS', label: 'Documents' },
  { key: 'PROJECT_MEMBERS', label: 'Project Members' },
  { key: 'WORKSPACE_MEMBERS', label: 'Workspace Members' },
  { key: 'WORKSPACE_SETTINGS', label: 'Workspace Settings' },
];

type Tab = 'general' | 'members' | 'roles';

function emptyPermissions(): RolePermissionInput[] {
  return MODULES.map(({ key }) => ({
    module: key,
    canCreate: false,
    canRead: false,
    canUpdate: false,
    canDelete: false,
  }));
}

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const { activeTenant, loading: tenantLoading, refreshTenants } = useTenant();

  const [tab, setTab] = useState<Tab>('general');
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<TenantMember | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<TenantRole | null>(null);
  const [toast, setToast] = useState('');

  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissions, setPermissions] = useState<RolePermissionInput[]>(emptyPermissions());

  const isOwner = activeTenant?.role === 'OWNER' || activeTenant?.role === 'Owner';
  const canManageMembers =
    isOwner ||
    activeTenant?.role === 'ADMIN' ||
    activeTenant?.role === 'Admin';

  const editableRoles = useMemo(
    () => roles.filter((role) => !role.isSystem),
    [roles],
  );

  async function loadMembers() {
    if (!activeTenant) return;
    setMembersLoading(true);
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

  async function loadRoles() {
    if (!activeTenant) return;
    setRolesLoading(true);
    try {
      const nextRoles = await getTenantRoles(activeTenant.id);
      setRoles(nextRoles);
      if (!inviteRoleId) {
        const firstCustom = nextRoles.find((role) => !role.isSystem);
        if (firstCustom) setInviteRoleId(firstCustom.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat role.');
    } finally {
      setRolesLoading(false);
    }
  }

  useEffect(() => {
    setWorkspaceName(activeTenant?.name ?? '');
    if (activeTenant) {
      void loadMembers();
      void loadRoles();
    }
  }, [activeTenant?.id, activeTenant?.name]);

  async function saveWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTenant || !workspaceName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateTenant(activeTenant.id, workspaceName.trim());
      await refreshTenants();
      setToast('Nama workspace berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui workspace.');
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTenant || !inviteEmail.trim() || !inviteRoleId) return;
    setSaving(true);
    setError('');
    try {
      await createTenantInvitation(activeTenant.id, inviteEmail.trim(), inviteRoleId);
      setToast('Invitation berhasil dikirim ke ' + inviteEmail.trim() + '.');
      setInviteEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengundang member.');
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(member: TenantMember, roleId: string) {
    if (!activeTenant || member.role === 'OWNER' || !roleId) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateTenantMemberRole(activeTenant.id, member.userId, roleId);
      setMembers((current) => current.map((item) => item.userId === updated.userId ? updated : item));
      setToast('Role member berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemoveMember() {
    if (!activeTenant || !removeTarget || removeTarget.role === 'OWNER') return;
    setSaving(true);
    setError('');
    try {
      await removeTenantMember(activeTenant.id, removeTarget.userId);
      setMembers((current) => current.filter((item) => item.userId !== removeTarget.userId));
      setToast('Member berhasil dihapus dari workspace.');
      setRemoveTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus member.');
    } finally {
      setSaving(false);
    }
  }

  function openCreateRole() {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setPermissions(emptyPermissions());
    setRoleEditorOpen(true);
  }

  function openEditRole(role: TenantRole) {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description ?? '');
    setPermissions(
      MODULES.map(({ key }) => {
        const existing = role.permissions.find((item) => item.module === key);
        return {
          module: key,
          canCreate: existing?.canCreate ?? false,
          canRead: existing?.canRead ?? false,
          canUpdate: existing?.canUpdate ?? false,
          canDelete: existing?.canDelete ?? false,
        };
      }),
    );
    setRoleEditorOpen(true);
  }

  function togglePermission(module: PermissionModule, action: keyof Omit<RolePermissionInput, 'module'>) {
    setPermissions((current) =>
      current.map((permission) =>
        permission.module === module
          ? { ...permission, [action]: !permission[action] }
          : permission,
      ),
    );
  }

  function setFullAccess(enabled: boolean) {
    setPermissions((current) =>
      current.map((permission) => ({
        ...permission,
        canCreate: enabled,
        canRead: enabled,
        canUpdate: enabled,
        canDelete: enabled,
      })),
    );
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTenant || !roleName.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingRoleId) {
        await updateTenantRole(activeTenant.id, editingRoleId, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissions,
        });
        setToast('Role berhasil diperbarui.');
      } else {
        await createTenantRole(activeTenant.id, {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissions,
        });
        setToast('Role berhasil dibuat.');
      }
      setRoleEditorOpen(false);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan role.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteRole() {
    if (!activeTenant || !deleteRoleTarget) return;
    setSaving(true);
    setError('');
    try {
      await deleteTenantRole(activeTenant.id, deleteRoleTarget.id);
      setToast('Role berhasil dihapus.');
      setDeleteRoleTarget(null);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus role.');
    } finally {
      setSaving(false);
    }
  }

  if (tenantLoading || !activeTenant) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200" />
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-10">
        <ModuleHeader
          icon="⚙"
          label="SETTINGS"
          title="Workspace Settings"
          subtitle={activeTenant.name}
          description="Kelola workspace, member, role, dan permission."
          accent="cyan"
        />

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
          {([
            ['general', 'General'],
            ['members', 'Members'],
            ...(isOwner ? [['roles', 'Roles & Permissions']] : []),
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === key ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'general' ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">General</p>
            <h2 className="mt-1 text-xl font-bold">Informasi Workspace</h2>
            <p className="mt-1 text-sm text-zinc-500">Perbarui nama workspace.</p>
            <form onSubmit={saveWorkspace} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                maxLength={100}
                required
                disabled={!canManageMembers || saving}
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900 disabled:bg-zinc-50"
              />
              <button
                type="submit"
                disabled={!canManageMembers || saving || !workspaceName.trim()}
                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Simpan Perubahan
              </button>
            </form>
          </section>
        ) : null}

        {tab === 'members' ? (
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Members</p>
              <h2 className="mt-1 text-xl font-bold">Invite & Manage Members</h2>
              <p className="mt-1 text-sm text-zinc-500">Setiap member memiliki satu role workspace.</p>
            </div>

            {canManageMembers ? (
              <form onSubmit={inviteMember} className="border-b border-zinc-100 bg-zinc-50 p-5 sm:p-6">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="email.member@example.com"
                    required
                    maxLength={255}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900"
                  />
                  <select
                    value={inviteRoleId}
                    onChange={(event) => setInviteRoleId(event.target.value)}
                    required
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold"
                  >
                    <option value="">Pilih role</option>
                    {editableRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={saving || !inviteEmail.trim() || !inviteRoleId}
                    className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
                  >
                    Send Invitation
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">Invitation berlaku 7 hari dan role akan langsung diberikan saat diterima.</p>
              </form>
            ) : null}

            <div className="p-5 sm:p-6">
              {membersLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-zinc-100" />)}</div>
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
                        ) : canManageMembers ? (
                          <>
                            <select
                              value={member.roleId ?? ''}
                              disabled={saving || rolesLoading}
                              onChange={(event) => void changeRole(member, event.target.value)}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold"
                            >
                              <option value="">Pilih role</option>
                              {editableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                            </select>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setRemoveTarget(member)}
                              className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </>
                        ) : (
                          <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">{member.roleName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'roles' && isOwner ? (
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Authorization</p>
                <h2 className="mt-1 text-xl font-bold">Roles & Permissions</h2>
                <p className="mt-1 text-sm text-zinc-500">Buat role sekali, lalu gunakan untuk banyak member.</p>
              </div>
              <button type="button" onClick={openCreateRole} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800">+ Buat Role</button>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              {rolesLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
              ) : roles.map((role) => (
                <div key={role.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{role.name}</h3>
                        {role.isSystem ? <span className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-500">SYSTEM</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{role.description || 'Tidak ada deskripsi.'}</p>
                    </div>
                    {!role.isSystem ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditRole(role)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold hover:bg-zinc-50">Edit</button>
                        <button type="button" onClick={() => setDeleteRoleTarget(role)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Hapus</button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {role.permissions.filter((permission) => permission.canCreate || permission.canRead || permission.canUpdate || permission.canDelete).map((permission) => (
                      <div key={permission.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-xs">
                        <p className="font-semibold">{permission.module.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-zinc-500">{[
                          permission.canCreate ? 'C' : '',
                          permission.canRead ? 'R' : '',
                          permission.canUpdate ? 'U' : '',
                          permission.canDelete ? 'D' : '',
                        ].filter(Boolean).join(' · ') || 'Tidak ada akses'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {roleEditorOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form onSubmit={saveRole} className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-zinc-100 p-5 sm:p-6">
                <h2 className="text-xl font-bold">{editingRoleId ? 'Edit Role' : 'Buat Role Baru'}</h2>
                <p className="mt-1 text-sm text-zinc-500">Atur akses CRUD untuk setiap modul.</p>
              </div>
              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500">Nama Role</label>
                    <input value={roleName} onChange={(event) => setRoleName(event.target.value)} required maxLength={80} className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500">Deskripsi</label>
                    <input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} maxLength={200} className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900" />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
                  <div>
                    <p className="text-sm font-semibold">Full Access</p>
                    <p className="text-xs text-zinc-500">Aktifkan CREATE, READ, UPDATE, DELETE untuk semua modul.</p>
                  </div>
                  <button type="button" onClick={() => setFullAccess(true)} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white">Aktifkan Semua</button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <div className="min-w-[720px]">
                    <div className="grid grid-cols-[minmax(240px,1fr)_70px_70px_70px_70px] border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-500">
                      <span>Module</span><span className="text-center">C</span><span className="text-center">R</span><span className="text-center">U</span><span className="text-center">D</span>
                    </div>
                    {MODULES.map(({ key, label }) => {
                      const permission = permissions.find((item) => item.module === key)!;
                      return (
                        <div key={key} className="grid grid-cols-[minmax(240px,1fr)_70px_70px_70px_70px] items-center border-b border-zinc-100 px-4 py-3 text-sm last:border-b-0">
                          <span className="font-semibold">{label}</span>
                          {(['canCreate', 'canRead', 'canUpdate', 'canDelete'] as const).map((action) => (
                            <label key={action} className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={Boolean(permission[action])}
                                onChange={() => togglePermission(key, action)}
                                className="h-4 w-4 rounded border-zinc-300"
                              />
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-zinc-100 p-5">
                <button type="button" onClick={() => setRoleEditorOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold">Batal</button>
                <button type="submit" disabled={saving || !roleName.trim()} className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Role'}</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Hapus member dari workspace?"
        description={removeTarget ? (removeTarget.user.name || removeTarget.user.username) + ' akan kehilangan akses ke workspace ini. Data akun tidak akan dihapus.' : ''}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemoveMember()}
        loading={saving}
      />
      <ConfirmDialog
        open={Boolean(deleteRoleTarget)}
        title="Hapus role?"
        description={deleteRoleTarget ? `Role "${deleteRoleTarget.name}" akan dihapus. Role yang masih digunakan member tidak dapat dihapus.` : ''}
        onClose={() => setDeleteRoleTarget(null)}
        onConfirm={() => void confirmDeleteRole()}
        loading={saving}
      />
      <Toast message={toast} open={Boolean(toast)} onClose={() => setToast('')} />
    </main>
  );
}
