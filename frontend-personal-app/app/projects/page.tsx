'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProjectMembers,
  getProjects,
  Project,
  ProjectMember,
  ProjectRole,
  ProjectStatus,
  removeProjectMember,
  updateProject,
  updateProjectMember,
} from '../../lib/projects';

const STATUS_OPTIONS: ProjectStatus[] = [
  'PLANNED',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
];

const STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNED: 'border-sky-200 bg-sky-50 text-sky-700',
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ON_HOLD: 'border-amber-200 bg-amber-50 text-amber-700',
  COMPLETED: 'border-violet-200 bg-violet-50 text-violet-700',
  ARCHIVED: 'border-zinc-200 bg-zinc-100 text-zinc-600',
};

const ROLE_STYLES: Record<Project['role'], string> = {
  OWNER: 'bg-zinc-900 text-white',
  ADMIN: 'bg-blue-100 text-blue-700',
  DEVELOPER: 'bg-emerald-100 text-emerald-700',
  REVIEWER: 'bg-amber-100 text-amber-700',
  VIEWER: 'bg-zinc-100 text-zinc-600',
};

function statusLabel(status: ProjectStatus): string {
  return status.replace('_', ' ');
}

function statusIcon(status: ProjectStatus): string {
  switch (status) {
    case 'ACTIVE':
      return '●';
    case 'COMPLETED':
      return '✓';
    case 'ON_HOLD':
      return 'Ⅱ';
    case 'ARCHIVED':
      return '▣';
    default:
      return '○';
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');
  const [memberProject, setMemberProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Exclude<ProjectRole, 'OWNER'>>('DEVELOPER');

  async function loadProjects() {
    setLoading(true);
    setError('');

    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
        return;
      }

      setError(err instanceof Error ? err.message : 'Gagal mengambil project.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const projectStats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((project) => project.status === 'ACTIVE').length,
      planned: projects.filter((project) => project.status === 'PLANNED').length,
      completed: projects.filter((project) => project.status === 'COMPLETED').length,
    }),
    [projects],
  );

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setStatus('PLANNED');
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  function openCreateForm() {
    resetForm();
    setFormOpen(true);
    setTimeout(() => {
      document.getElementById('project-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description ?? '');
    setStatus(project.status);
    setFormOpen(true);

    setTimeout(() => {
      document.getElementById('project-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  async function openMembers(project: Project) {
    setMemberProject(project);
    setNewMemberUserId('');
    setNewMemberRole('DEVELOPER');
    setError('');
    try {
      setMemberLoading(true);
      setMembers(await getProjectMembers(project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat member project.');
    } finally {
      setMemberLoading(false);
    }
  }

  function closeMembers() {
    setMemberProject(null);
    setMembers([]);
    setNewMemberUserId('');
  }

  async function handleAddMember() {
    if (!memberProject || !newMemberUserId.trim()) return;
    try {
      setMemberSaving(true);
      setError('');
      const member = await addProjectMember(memberProject.id, {
        userId: newMemberUserId.trim(),
        role: newMemberRole,
      });
      setMembers(current => [...current, member]);
      setNewMemberUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan member.');
    } finally {
      setMemberSaving(false);
    }
  }

  async function handleMemberRoleChange(member: ProjectMember, role: Exclude<ProjectRole, 'OWNER'>) {
    if (!memberProject) return;
    try {
      setMemberSaving(true);
      setError('');
      const updated = await updateProjectMember(memberProject.id, member.userId, { role });
      setMembers(current => current.map(item => item.userId === updated.userId ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role member.');
    } finally {
      setMemberSaving(false);
    }
  }

  async function handleRemoveMember(member: ProjectMember) {
    if (!memberProject || !window.confirm('Hapus member "' + (member.user.name || member.user.username) + '" dari project?')) return;
    try {
      setMemberSaving(true);
      setError('');
      await removeProjectMember(memberProject.id, member.userId);
      setMembers(current => current.filter(item => item.userId !== member.userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus member.');
    } finally {
      setMemberSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingId) {
        await updateProject(editingId, {
          name,
          description,
          status,
        });
      } else {
        await createProject({
          name,
          description: description || undefined,
        });
      }

      closeForm();
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan project.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project: Project) {
    if (!window.confirm(`Hapus project "${project.name}"?`)) {
      return;
    }

    setError('');

    try {
      await deleteProject(project.id);
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus project.');
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Projects
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Kelola seluruh project development kamu dalam satu tempat.
                Pilih project untuk mulai mengatur pekerjaan dan progress.
              </p>
            </div>

            <button
              type="button"
              onClick={formOpen ? closeForm : openCreateForm}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md"
            >
              <span className="text-xl leading-none">{formOpen ? '×' : '+'}</span>
              {formOpen ? 'Tutup Form' : 'Project Baru'}
            </button>
          </div>
        </header>

        {!loading && projects.length > 0 ? (
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-zinc-500">Total Project</p>
              <p className="mt-2 text-3xl font-bold">{projectStats.total}</p>
              <p className="mt-1 text-xs text-zinc-400">Semua project kamu</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
              <p className="text-sm text-emerald-700">Active</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900">{projectStats.active}</p>
              <p className="mt-1 text-xs text-emerald-700/70">Sedang dikerjakan</p>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
              <p className="text-sm text-sky-700">Planned</p>
              <p className="mt-2 text-3xl font-bold text-sky-900">{projectStats.planned}</p>
              <p className="mt-1 text-xs text-sky-700/70">Belum dimulai</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
              <p className="text-sm text-violet-700">Completed</p>
              <p className="mt-2 text-3xl font-bold text-violet-900">{projectStats.completed}</p>
              <p className="mt-1 text-xs text-violet-700/70">Sudah selesai</p>
            </div>
          </div>
        ) : null}

        {formOpen ? (
          <section
            id="project-form"
            className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {editingId ? 'Project' : 'New Project'}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {editingId ? 'Edit Project' : 'Buat Project Baru'}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {editingId
                      ? 'Perbarui informasi dan status project.'
                      : 'Isi informasi dasar project untuk mulai bekerja.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg p-2 text-xl leading-none text-zinc-400 transition hover:bg-white hover:text-zinc-700"
                  aria-label="Tutup form"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 p-6">
              <div>
                <label htmlFor="project-name" className="mb-2 block text-sm font-semibold">
                  Nama Project <span className="text-red-500">*</span>
                </label>
                <input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={200}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100"
                  placeholder="Contoh: Personal Developer Assistant"
                />
              </div>

              <div>
                <label htmlFor="project-description" className="mb-2 block text-sm font-semibold">
                  Deskripsi <span className="font-normal text-zinc-400">(opsional)</span>
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100"
                  placeholder="Jelaskan secara singkat tujuan atau ruang lingkup project..."
                />
              </div>

              {editingId ? (
                <div>
                  <label htmlFor="project-status" className="mb-2 block text-sm font-semibold">
                    Status Project
                  </label>
                  <select
                    id="project-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100 sm:max-w-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {statusLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Menyimpan...'
                    : editingId
                      ? 'Simpan Perubahan'
                      : 'Buat Project'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {error ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <span className="mt-0.5 font-bold">!</span>
            <div>
              <p className="font-semibold">Terjadi kesalahan</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        ) : null}

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Workspace
              </p>
              <h2 className="mt-1 text-xl font-bold">Daftar Project</h2>
              {!loading ? (
                <p className="mt-1 text-sm text-zinc-500">
                  {projects.length === 0
                    ? 'Belum ada project'
                    : `${projects.length} project tersedia`}
                </p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl text-zinc-400">
                +
              </div>
              <h3 className="mt-5 text-lg font-bold">Belum ada project</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Mulai dengan membuat project pertama kamu. Semua project,
                task, dan aktivitas development bisa dikelola dari sini.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-6 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                + Buat Project Pertama
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group flex min-h-52 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-600">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-zinc-900">
                          {project.name}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                          Project
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[project.status]}`}
                    >
                      <span>{statusIcon(project.status)}</span>
                      {statusLabel(project.status)}
                    </span>
                  </div>

                  <p className="mt-5 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-500">
                    {project.description || 'Belum ada deskripsi untuk project ini.'}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${ROLE_STYLES[project.role]}`}
                    >
                      {project.role}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void openMembers(project)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        Members
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(project)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        Edit
                      </button>

                      {project.role === 'OWNER' ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(project)}
                          className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
        {memberProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMembers(); }}>
            <section className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-zinc-100 p-6">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Project Members</p><h2 className="mt-1 text-xl font-bold">{memberProject.name}</h2><p className="mt-1 text-sm text-zinc-500">Kelola anggota dan role project.</p></div>
                <button type="button" onClick={closeMembers} className="rounded-lg p-2 text-xl leading-none text-zinc-400 hover:bg-zinc-100">×</button>
              </div>
              <div className="p-6">
                {(memberProject.role === 'OWNER' || memberProject.role === 'ADMIN') ? (
                  <div className="mb-6 rounded-2xl bg-zinc-50 p-4">
                    <p className="mb-3 text-sm font-semibold">Tambah Member</p>
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                      <input value={newMemberUserId} onChange={e => setNewMemberUserId(e.target.value)} placeholder="UUID User" className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-zinc-900" />
                      <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value as Exclude<ProjectRole, 'OWNER'>)} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none">
                        <option value="ADMIN">ADMIN</option><option value="DEVELOPER">DEVELOPER</option><option value="REVIEWER">REVIEWER</option><option value="VIEWER">VIEWER</option>
                      </select>
                      <button type="button" onClick={() => void handleAddMember()} disabled={!newMemberUserId.trim() || memberSaving} className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">{memberSaving ? '...' : 'Tambah'}</button>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">Masukkan UUID user yang sudah terdaftar pada PDA.</p>
                  </div>
                ) : null}
                <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Daftar Member</p><span className="text-xs text-zinc-400">{members.length} member</span></div>
                {memberLoading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100" />)}</div> : members.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400">Belum ada member.</div> : <div className="space-y-2">{members.map(member => <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.user.name || member.user.username}</p><p className="truncate text-xs text-zinc-400">{member.user.email} · {member.userId}</p></div><div className="flex items-center gap-2">{member.role === 'OWNER' ? <span className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-bold text-white">OWNER</span> : (memberProject.role === 'OWNER' || memberProject.role === 'ADMIN') ? <><select value={member.role} disabled={memberSaving} onChange={e => void handleMemberRoleChange(member, e.target.value as Exclude<ProjectRole, 'OWNER'>)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold"><option value="ADMIN">ADMIN</option><option value="DEVELOPER">DEVELOPER</option><option value="REVIEWER">REVIEWER</option><option value="VIEWER">VIEWER</option></select><button type="button" disabled={memberSaving} onClick={() => void handleRemoveMember(member)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Hapus</button></> : <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">{member.role}</span>}</div></div>)}</div>}
              </div>
            </section>
          </div>
        ) : null}

    </main>
  );
}
