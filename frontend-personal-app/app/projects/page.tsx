'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import {
  createProject,
  deleteProject,
  getProjects,
  Project,
  ProjectStatus,
  updateProject,
} from '../../lib/projects';

const STATUS_OPTIONS: ProjectStatus[] = [
  'PLANNED',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
];

function statusLabel(status: ProjectStatus): string {
  return status.replace('_', ' ');
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');

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

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setStatus('PLANNED');
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description ?? '');
    setStatus(project.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      resetForm();
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
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Personal Developer Assistant
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Projects
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Kelola project dan status pekerjaan development kamu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-zinc-100"
          >
            + Project Baru
          </button>
        </header>

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Edit Project' : 'Buat Project'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <label htmlFor="project-name" className="mb-2 block text-sm font-medium">
                Nama Project
              </label>
              <input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={200}
                required
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                placeholder="Personal Developer Assistant"
              />
            </div>

            <div>
              <label htmlFor="project-description" className="mb-2 block text-sm font-medium">
                Deskripsi
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                placeholder="Deskripsi project..."
              />
            </div>

            {editingId ? (
              <div>
                <label htmlFor="project-status" className="mb-2 block text-sm font-medium">
                  Status
                </label>
                <select
                  id="project-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Project'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium hover:bg-zinc-100"
                >
                  Batal
                </button>
              ) : null}
            </div>
          </form>
        </section>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Daftar Project</h2>
            <span className="text-sm text-zinc-500">{projects.length} project</span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
              Memuat project...
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-zinc-200">
              <p className="font-medium">Belum ada project</p>
              <p className="mt-1 text-sm text-zinc-500">
                Buat project pertama untuk mulai mengelola pekerjaan.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold">{project.name}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {project.description || 'Tidak ada deskripsi.'}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      {statusLabel(project.status)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                    <span className="text-xs font-medium text-zinc-500">
                      Role: {project.role}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(project)}
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-100"
                      >
                        Edit
                      </button>
                      {project.role === 'OWNER' ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(project)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
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
    </main>
  );
}
