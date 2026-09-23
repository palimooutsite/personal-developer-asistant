import { Task } from '../../lib/tasks';

export function TaskStats({ tasks }: { tasks: Task[] }) {
  const items = [
    ['Total', tasks.length, 'Semua task'],
    ['To Do', tasks.filter((t) => t.status === 'TODO').length, 'Belum dikerjakan'],
    ['In Progress', tasks.filter((t) => t.status === 'IN_PROGRESS').length, 'Sedang dikerjakan'],
    ['Done', tasks.filter((t) => t.status === 'DONE').length, 'Selesai'],
  ];
  return <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {items.map(([label, value, helper]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{helper}</p></div>)}
  </div>;
}
