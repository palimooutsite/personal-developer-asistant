import Link from 'next/link';
import { Project, ProjectRole, ProjectStatus } from '../../lib/projects';

interface ProjectCardProps {
  project: Project;
  onMembers: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNED: 'border-sky-200 bg-sky-50 text-sky-700',
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ON_HOLD: 'border-amber-200 bg-amber-50 text-amber-700',
  COMPLETED: 'border-violet-200 bg-violet-50 text-violet-700',
  ARCHIVED: 'border-zinc-200 bg-zinc-100 text-zinc-600',
};

const ROLE_STYLES: Record<ProjectRole, string> = {
  OWNER: 'bg-zinc-900 text-white',
  ADMIN: 'bg-blue-100 text-blue-700',
  DEVELOPER: 'bg-emerald-100 text-emerald-700',
  REVIEWER: 'bg-amber-100 text-amber-700',
  VIEWER: 'bg-zinc-100 text-zinc-600',
};

function statusIcon(status: ProjectStatus) {
  switch (status) {
    case 'ACTIVE': return '●';
    case 'COMPLETED': return '✓';
    case 'ON_HOLD': return 'Ⅱ';
    case 'ARCHIVED': return '▣';
    default: return '○';
  }
}

export function ProjectCard({ project, onMembers, onEdit, onDelete }: ProjectCardProps) {
  return (
    <article className="group flex min-h-52 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg">
      <Link href={`/tasks?projectId=${project.id}`} className="block flex-1 rounded-xl outline-none focus:ring-2 focus:ring-blue-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-600">{project.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-zinc-900">{project.name}</h3>
            <p className="mt-1 text-xs text-zinc-400">Project</p>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[project.status]}`}>
          <span>{statusIcon(project.status)}</span>{project.status.replace('_', ' ')}
        </span>
      </div>
      <p className="mt-5 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-500">{project.description || 'Belum ada deskripsi untuk project ini.'}</p>
      <p className="mt-2 text-xs font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100">Lihat Tasks →</p>
      </Link>
      <div className="mt-auto flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${ROLE_STYLES[project.role]}`}>{project.role}</span>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => onMembers(project)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100">Members</button>
          {onEdit ? <button type="button" onClick={() => onEdit(project)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-100">Edit</button> : null}
          {project.role === 'OWNER' ? {onDelete ? <button type="button" onClick={() => onDelete(project)} className="col-span-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100 sm:col-span-1">Hapus</button> : null}
        </div>
      </div>
    </article>
  );
}
