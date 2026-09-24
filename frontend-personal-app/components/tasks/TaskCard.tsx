import { Task, TaskPriority, TaskStatus } from '../../lib/tasks';

const status: Record<TaskStatus, { label: string; icon: string; className: string }> = {
  TODO: { label: 'To Do', icon: '○', className: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'In Progress', icon: '◐', className: 'bg-blue-100 text-blue-700' },
  REVIEW: { label: 'Review', icon: '◌', className: 'bg-amber-100 text-amber-700' },
  DONE: { label: 'Done', icon: '✓', className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', icon: '×', className: 'bg-red-100 text-red-700' },
};

const priority: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : 'Tanpa deadline';

const isOverdue = (value: string | null, taskStatus: TaskStatus) =>
  Boolean(value && taskStatus !== 'DONE' && taskStatus !== 'CANCELLED' && new Date(value) < new Date());

interface TaskCardProps {
  task: Task;
  deleting: boolean;
  onAssignees: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({ task, deleting, onAssignees, onEdit, onDelete }: TaskCardProps) {
  const statusStyle = status[task.status];
  const priorityStyle = priority[task.priority];
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-zinc-900">{task.title}</h3>
          {task.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">{task.description}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.className}`}>
          {statusStyle.icon} {statusStyle.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyle.className}`}>{priorityStyle.label}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${overdue ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}>
          {overdue ? '⚠ ' : '📅 '}{formatDate(task.dueDate)}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {task.assignees?.length ? task.assignees.map((assignee) => (
            <span key={assignee.userId} className="max-w-full truncate rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
              {assignee.name || assignee.username || assignee.email || 'User'}
            </span>
          )) : <span className="text-xs text-zinc-400">Belum ada assignee</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => onAssignees(task)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100">Assignee</button>
          <button type="button" onClick={() => onEdit(task)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-100">Edit</button>
          <button type="button" onClick={() => onDelete(task)} disabled={deleting} className="col-span-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1">
            {deleting ? '...' : 'Hapus'}
          </button>
        </div>
      </div>
    </article>
  );
}
