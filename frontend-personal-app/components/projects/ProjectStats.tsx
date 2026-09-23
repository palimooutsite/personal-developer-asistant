import { Project } from '../../lib/projects';

interface ProjectStatsProps {
  projects: Project[];
}

export function ProjectStats({ projects }: ProjectStatsProps) {
  const total = projects.length;
  const active = projects.filter((project) => project.status === 'ACTIVE').length;
  const planned = projects.filter((project) => project.status === 'PLANNED').length;
  const completed = projects.filter((project) => project.status === 'COMPLETED').length;

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Total Project</p>
        <p className="mt-2 text-3xl font-bold">{total}</p>
        <p className="mt-1 text-xs text-zinc-400">Semua project kamu</p>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
        <p className="text-sm text-emerald-700">Active</p>
        <p className="mt-2 text-3xl font-bold text-emerald-900">{active}</p>
        <p className="mt-1 text-xs text-emerald-700/70">Sedang dikerjakan</p>
      </div>
      <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
        <p className="text-sm text-sky-700">Planned</p>
        <p className="mt-2 text-3xl font-bold text-sky-900">{planned}</p>
        <p className="mt-1 text-xs text-sky-700/70">Belum dimulai</p>
      </div>
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
        <p className="text-sm text-violet-700">Completed</p>
        <p className="mt-2 text-3xl font-bold text-violet-900">{completed}</p>
        <p className="mt-1 text-xs text-violet-700/70">Sudah selesai</p>
      </div>
    </div>
  );
}
