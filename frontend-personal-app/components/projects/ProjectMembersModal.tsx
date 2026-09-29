import { useEffect, useState } from 'react';
import { Project, ProjectMember, ProjectRole } from '../../lib/projects';
import { searchUsers, UserPickerItem } from '../../lib/users';

type EditableRole = Exclude<ProjectRole, 'OWNER'>;

interface ProjectMembersModalProps {
  project: Project;
  members: ProjectMember[];
  loading: boolean;
  saving: boolean;
  onClose: () => void;
  onAddMembers?: (users: UserPickerItem[], roles: Record<string, EditableRole>) => Promise<void>;
  onRoleChange?: (member: ProjectMember, role: EditableRole) => Promise<void>;
  onRemoveMember?: (member: ProjectMember) => Promise<void>;
}

export function ProjectMembersModal({
  project, members, loading, saving, onClose, onAddMembers, onRoleChange, onRemoveMember,
}: ProjectMembersModalProps) {
  const canManage = Boolean(onAddMembers || onRoleChange || onRemoveMember);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserPickerItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserPickerItem[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, EditableRole>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await searchUsers(search, page, limit, members.map((member) => member.userId));
        setResults(response.data);
        setTotalPages(response.meta.totalPages);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [canManage, search, page, limit, members]);

  const toggleUser = (user: UserPickerItem) => {
    const selected = selectedUsers.some((item) => item.id === user.id);
    setSelectedUsers((current) => selected ? current.filter((item) => item.id !== user.id) : [...current, user]);
    setSelectedRoles((current) => {
      if (selected) {
        const next = { ...current };
        delete next[user.id];
        return next;
      }
      return { ...current, [user.id]: current[user.id] ?? 'DEVELOPER' };
    });
  };

  const addMembers = async () => {
    if (!onAddMembers) return;
    await onAddMembers(selectedUsers, selectedRoles);
    setSelectedUsers([]);
    setSelectedRoles({});
    setSearch('');
    setResults([]);
    setPage(1);
    setTotalPages(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 p-4 sm:p-6">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Project Members</p><h2 className="mt-1 text-xl font-bold">{project.name}</h2><p className="mt-1 text-sm text-zinc-500">Kelola anggota dan role project.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-xl leading-none text-zinc-400 hover:bg-zinc-100">×</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {canManage ? (
            <div className="mb-6 rounded-2xl bg-zinc-50 p-4">
              <p className="mb-3 text-sm font-semibold">Tambah Member</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari username, email, atau nama..." className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-900" />
                <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none">
                  <option value={5}>5 user</option><option value={10}>10 user</option>
                </select>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Daftar User</p>
                  <p className="text-xs text-zinc-400">{selectedUsers.length} dipilih</p>
                </div>
                {searchLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-400">Memuat user...</div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-400">User tidak ditemukan.</div>
                ) : (
                  <>
                    <div className="divide-y divide-zinc-100">
                      {results.map((user) => {
                        const selected = selectedUsers.some((item) => item.id === user.id);
                        return (
                          <label key={user.id} className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-zinc-50 ${selected ? 'bg-blue-50/60' : ''}`}>
                            <input type="checkbox" checked={selected} onChange={() => toggleUser(user)} className="h-4 w-4 rounded border-zinc-300" />
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{(user.name || user.username).charAt(0).toUpperCase()}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-zinc-800">{user.name || user.username}</span>
                              <span className="block truncate text-xs text-zinc-400">@{user.username} · {user.email}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {totalPages > 1 ? (
                      <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2">
                        <button type="button" disabled={page <= 1 || searchLoading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40">← Sebelumnya</button>
                        <span className="text-xs text-zinc-400">Halaman {page} / {totalPages}</span>
                        <button type="button" disabled={page >= totalPages || searchLoading} onClick={() => setPage((value) => value + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40">Berikutnya →</button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {selectedUsers.length > 0 ? (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-900">User yang akan ditambahkan ({selectedUsers.length})</p>
                    <button type="button" onClick={() => { setSelectedUsers([]); setSelectedRoles({}); }} className="text-xs font-semibold text-blue-700 hover:underline">Bersihkan</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white p-2">
                        <span className="min-w-0 flex-1 truncate px-1 text-xs font-semibold text-blue-900">{user.name || user.username}</span>
                        <select value={selectedRoles[user.id] ?? 'DEVELOPER'} onChange={(event) => setSelectedRoles((current) => ({ ...current, [user.id]: event.target.value as EditableRole }))} className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700">
                          <option value="ADMIN">ADMIN</option><option value="DEVELOPER">DEVELOPER</option><option value="REVIEWER">REVIEWER</option><option value="VIEWER">VIEWER</option>
                        </select>
                        <button type="button" onClick={() => toggleUser(user)} className="rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => void addMembers()} disabled={selectedUsers.length === 0 || saving} className="w-full rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                  {saving ? 'Menyimpan...' : selectedUsers.length > 0 ? `Simpan ${selectedUsers.length} Member` : 'Simpan Member'}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-400">Daftar user ditampilkan otomatis. Gunakan pencarian untuk mempersempit hasil, lalu pilih satu atau beberapa user dan klik Simpan.</p>
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Daftar Member</p><span className="text-xs text-zinc-400">{members.length} member</span></div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />)}</div>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">Belum ada member.</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{member.user.name || member.user.username}</p><p className="truncate text-xs text-zinc-400">{member.user.email} · {member.userId}</p></div>
                  <div className="flex items-center gap-2">
                    {member.role === 'OWNER' ? <span className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white">OWNER</span> : canManage ? (
                      <>
                        <select disabled={!onRoleChange || saving} value={member.role} disabled={saving} onChange={(e) => void onRoleChange(member, e.target.value as EditableRole)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold">
                          <option value="ADMIN">ADMIN</option><option value="DEVELOPER">DEVELOPER</option><option value="REVIEWER">REVIEWER</option><option value="VIEWER">VIEWER</option>
                        </select>
                        <button type="button" disabled={saving} onClick={() => void onRemoveMember(member)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Hapus</button>
                      </>
                    ) : <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">{member.role}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
