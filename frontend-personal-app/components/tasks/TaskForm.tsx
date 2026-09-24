import { FormEvent } from 'react';
import { TaskPriority, TaskStatus } from '../../lib/tasks';
import { StyledSelect } from '../ui/StyledSelect';
import { DateField } from '../ui/DateField';

const statuses: Record<TaskStatus, string> = { TODO:'To Do', IN_PROGRESS:'In Progress', REVIEW:'Review', DONE:'Done', CANCELLED:'Cancelled' };
const priorities: Record<TaskPriority, string> = { LOW:'Low', MEDIUM:'Medium', HIGH:'High', URGENT:'Urgent' };

export interface TaskFormProps {
  editing: boolean; projectName: string; title: string; description: string; status: TaskStatus; priority: TaskPriority; dueDate: string; saving: boolean;
  onTitleChange:(v:string)=>void; onDescriptionChange:(v:string)=>void; onStatusChange:(v:TaskStatus)=>void; onPriorityChange:(v:TaskPriority)=>void; onDueDateChange:(v:string)=>void; onSubmit:(e:FormEvent<HTMLFormElement>)=>void; onClose:()=>void;
}

export function TaskForm(p: TaskFormProps) {
  return <form onSubmit={p.onSubmit} className="bg-white p-5 sm:p-6">
    <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Management</p><h2 className="mt-1 text-lg font-bold">{p.editing ? 'Edit Task' : 'Task Baru'}</h2><p className="mt-1 text-sm text-slate-500">{p.editing ? 'Perbarui informasi task yang dipilih.' : 'Tambahkan task ke project ' + p.projectName + '.'}</p></div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Judul Task</span><input value={p.title} onChange={e=>p.onTitleChange(e.target.value)} maxLength={200} required className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Contoh: Implementasi JWT authentication"/></label>
      <label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Deskripsi</span><textarea value={p.description} onChange={e=>p.onDescriptionChange(e.target.value)} maxLength={2000} rows={4} className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/></label>
      {p.editing && <div><span className="mb-1.5 block text-sm font-semibold">Status</span><StyledSelect value={p.status} onChange={v=>p.onStatusChange(v as TaskStatus)} options={Object.entries(statuses).map(([value,label])=>({value,label}))} /></div>}
      <div><span className="mb-1.5 block text-sm font-semibold">Prioritas</span><StyledSelect value={p.priority} onChange={v=>p.onPriorityChange(v as TaskPriority)} options={Object.entries(priorities).map(([value,label])=>({value,label}))} /></div>
      <DateField id="task-due-date" value={p.dueDate} onChange={p.onDueDateChange} />
    </div>
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={p.onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50">Batal</button><button type="submit" disabled={p.saving||!p.title.trim()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{p.saving?'Menyimpan...':p.editing?'Simpan Perubahan':'Buat Task'}</button></div>
  </form>;
}
