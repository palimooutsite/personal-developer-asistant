'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import {
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
  addProjectMembers,
} from '../../lib/projects';
import { UserPickerItem } from '../../lib/users';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { ProjectForm } from '../../components/projects/ProjectForm';
import { ProjectMembersModal } from '../../components/projects/ProjectMembersModal';
import { ProjectStats } from '../../components/projects/ProjectStats';

type EditableRole = Exclude<ProjectRole, 'OWNER'>;

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

  async function loadProjects() {
    setLoading(true);
    setError('');
    try {
      setProjects(await getProjects());
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
      document.getElementById('project-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description ?? '');
    setStatus(project.status);
    setFormOpen(true);
    setTimeout(() => {
      document.getElementById('project-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  async function openMembers(project: Project) {
    setMemberProject(project);
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
  }

  async function handleAddMembers(users: UserPickerItem[], roles: Record<string, EditableRole>) {
    if (!memberProject || users.length === 0) return;
    try {
      setMemberSaving(true);
      setError('');
      const addedMembers = await addProjectMembers(memberProject.id, {
        members: users.map((user) => ({
          userId: user.id,
          role: roles[user.id] ?? 'DEVELOPER',
        })),
      });
      setMembers((current) => [...current, ...addedMembers]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan member.');
      throw err;
    } finally {
      setMemberSaving(false);
    }
  }

  async function handleMemberRoleChange(member: ProjectMember, role: EditableRole) {
    if (!memberProject) return;
    try {
      setMemberSaving(true);
      setError('');
      const updated = await updateProjectMember(memberProject.id, member.userId, { role });
      setMembers((current) => current.map((item) => item.userId === updated.userId ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role member.');
      throw err;
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
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
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
        await updateProject(editingId, { name, description, status });
      } else {
        await createProject({ name, description: description || undefined });
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
    if (!window.confirm(`Hapus project "${project.name}"?`)) return;
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
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            ← Kembali ke Menu
          </button>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Workspace
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
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

        {!loading && projects.length > 0 ? <ProjectStats projects={projects} /> : null}

        {formOpen ? (
          <ProjectForm
            editingId={editingId}
            name={name}
            description={description}
            status={status}
            saving={saving}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onStatusChange={setStatus}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
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
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Workspace</p>
              <h2 className="mt-1 text-xl font-bold">Daftar Project</h2>
              {!loading ? (
                <p className="mt-1 text-sm text-zinc-500">
                  {projects.length === 0 ? 'Belum ada project' : `${projects.length} project tersedia`}
                </p>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl text-zinc-400">+</div>
              <h3 className="mt-5 text-lg font-bold">Belum ada project</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Mulai dengan membuat project pertama kamu. Semua project, task, dan aktivitas development bisa dikelola dari sini.
              </p>
              <button type="button" onClick={openCreateForm} className="mt-6 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
                + Buat Project Pertama
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onMembers={(item) => void openMembers(item)}
                  onEdit={startEdit}
                  onDelete={(item) => void handleDelete(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {memberProject ? (
        <ProjectMembersModal
          project={memberProject}
          members={members}
          loading={memberLoading}
          saving={memberSaving}
          onClose={closeMembers}
          onAddMembers={handleAddMembers}
          onRoleChange={handleMemberRoleChange}
          onRemoveMember={handleRemoveMember}
        />
      ) : null}
    </main>
  );
}
