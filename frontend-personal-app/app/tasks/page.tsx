'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProjectMembers, getProjects, Project, ProjectMember } from '../../lib/projects';
import { addTaskAssignee, createTask, deleteTask, getTasks, removeTaskAssignee, Task, TaskPriority, TaskStatus, updateTask } from '../../lib/tasks';

const statusMeta: Record<TaskStatus, { label: string; icon: string; className: string }> = {
  TODO: { label: 'To Do', icon: '○', className: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'In Progress', icon: '◐', className: 'bg-blue-100 text-blue-700' },
  REVIEW: { label: 'Review', icon: '◌', className: 'bg-amber-100 text-amber-700' },
  DONE: { label: 'Done', icon: '✓', className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', icon: '×', className: 'bg-red-100 text-red-700' },
};
const priorityMeta: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};
function formatDate(value: string | null) { if (!value) return 'Tanpa deadline'; return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
function isOverdue(value: string | null, status: TaskStatus) { return Boolean(value && status !== 'DONE' && status !== 'CANCELLED' && new Date(value) < new Date()); }

export default function TasksPage() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get('projectId');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(requestedProjectId ?? '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [assigneeTask, setAssigneeTask] = useState<Task | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeSaving, setAssigneeSaving] = useState(false);

  useEffect(() => { (async () => { try { setLoadingProjects(true); const data = await getProjects(); setProjects(data); if (data.length && !data.some(p => p.id === requestedProjectId)) setProjectId(data[0].id); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat project'); } finally { setLoadingProjects(false); } })(); }, [requestedProjectId]);
  useEffect(() => { if (!projectId) { setTasks([]); return; } (async () => { try { setLoadingTasks(true); setError(''); setTasks(await getTasks(projectId)); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat task'); } finally { setLoadingTasks(false); } })(); }, [projectId]);
  const selectedProject = projects.find(p => p.id === projectId);
  const stats = useMemo(() => ({ total: tasks.length, todo: tasks.filter(t => t.status === 'TODO').length, inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length, done: tasks.filter(t => t.status === 'DONE').length }), [tasks]);
  async function openAssignees(task: Task) {
    setAssigneeTask(task); setAssigneeUserId(''); setError('');
    try { setLoadingMembers(true); setMembers(await getProjectMembers(projectId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat member project'); }
    finally { setLoadingMembers(false); }
  }
  function closeAssignees() { setAssigneeTask(null); setAssigneeUserId(''); setMembers([]); }
  async function handleAddAssignee() {
    if (!assigneeTask || !assigneeUserId) return;
    try { setAssigneeSaving(true); setError(''); await addTaskAssignee(projectId, assigneeTask.id, assigneeUserId); const selected = members.find(m => m.userId === assigneeUserId); if (selected) { const a = { taskId: assigneeTask.id, projectId, userId: selected.userId, username: selected.user.username, email: selected.user.email, name: selected.user.name }; setTasks(current => current.map(t => t.id === assigneeTask.id ? { ...t, assignees: [...(t.assignees ?? []), a] } : t)); setAssigneeTask(current => current ? { ...current, assignees: [...(current.assignees ?? []), a] } : current); } setAssigneeUserId(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal menambahkan assignee'); }
    finally { setAssigneeSaving(false); }
  }
  async function handleRemoveAssignee(userId: string) {
    if (!assigneeTask) return;
    try { setAssigneeSaving(true); setError(''); await removeTaskAssignee(projectId, assigneeTask.id, userId); setTasks(current => current.map(t => t.id === assigneeTask.id ? { ...t, assignees: (t.assignees ?? []).filter(a => a.userId !== userId) } : t)); setAssigneeTask(current => current ? { ...current, assignees: (current.assignees ?? []).filter(a => a.userId !== userId) } : current); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal menghapus assignee'); }
    finally { setAssigneeSaving(false); }
  }

  function resetForm() { setTitle(''); setDescription(''); setStatus('TODO'); setPriority('MEDIUM'); setDueDate(''); setEditing(null); }
  function openCreate() { resetForm(); setFormOpen(true); }
  function openEdit(task: Task) { setEditing(task); setTitle(task.title); setDescription(task.description ?? ''); setStatus(task.status); setPriority(task.priority); setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : ''); setFormOpen(true); }
  function closeForm() { resetForm(); setFormOpen(false); }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!projectId || !title.trim()) return; try { setSaving(true); setError(''); if (editing) { const updated = await updateTask(projectId, editing.id, { title: title.trim(), description: description.trim() || null, status, priority, dueDate: dueDate || null }); setTasks(current => current.map(t => t.id === updated.id ? updated : t)); } else { const created = await createTask(projectId, { title: title.trim(), description: description.trim() || undefined, priority, dueDate: dueDate || undefined }); setTasks(current => [created, ...current]); } closeForm(); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan task'); } finally { setSaving(false); } }
  async function handleDelete(task: Task) { if (!window.confirm('Hapus task "' + task.title + '"?')) return; try { setDeletingId(task.id); setError(''); await deleteTask(projectId, task.id); setTasks(current => current.filter(t => t.id !== task.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menghapus task'); } finally { setDeletingId(''); } }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><Link href="/" className="mb-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">← Kembali ke menu</Link><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">Task Management</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tasks</h1><p className="mt-2 max-w-2xl text-slate-500">Kelola pekerjaan project, deadline, prioritas, dan status task dalam satu tempat.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row"><select value={projectId} onChange={e => { setProjectId(e.target.value); closeForm(); }} disabled={loadingProjects || !projects.length} className="min-w-64 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{projects.length ? projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Belum ada project</option>}</select><button type="button" onClick={formOpen ? closeForm : openCreate} disabled={!projectId} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">{formOpen ? 'Tutup Form' : '+ Task Baru'}</button></div>
    </div>
    {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loadingProjects ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div> : !projects.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">📁</div><h2 className="text-xl font-bold">Belum ada project</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Task harus berada di dalam project. Buat project terlebih dahulu.</p><Link href="/projects" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Buat Project</Link></div> : <>
      {formOpen && <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-lg font-bold">{editing ? 'Edit Task' : 'Task Baru'}</h2><p className="mt-1 text-sm text-slate-500">{editing ? 'Perbarui informasi task yang dipilih.' : 'Tambahkan task ke project ' + (selectedProject?.name ?? '') + '.'}</p></div><div className="grid gap-4 md:grid-cols-2"><label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Judul Task</span><input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} required placeholder="Contoh: Implementasi JWT authentication" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><label className="md:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Deskripsi</span><textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={4} placeholder="Jelaskan pekerjaan yang perlu dilakukan..." className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>{editing && <label><span className="mb-1.5 block text-sm font-semibold">Status</span><select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none">{Object.entries(statusMeta).map(([v,m]) => <option key={v} value={v}>{m.label}</option>)}</select></label>}<label><span className="mb-1.5 block text-sm font-semibold">Prioritas</span><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none">{Object.entries(priorityMeta).map(([v,m]) => <option key={v} value={v}>{m.label}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-semibold">Deadline</span><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" /></label></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50">Batal</button><button type="submit" disabled={saving || !title.trim()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Task'}</button></div></form>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Total',stats.total,'Semua task'],['To Do',stats.todo,'Belum dikerjakan'],['In Progress',stats.inProgress,'Sedang dikerjakan'],['Done',stats.done,'Selesai']].map(([label,value,helper]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{helper}</p></div>)}</div>
      <div className="mb-4"><h2 className="text-xl font-bold">{selectedProject?.name}</h2><p className="mt-1 text-sm text-slate-500">{tasks.length} task dalam project ini</p></div>
      {loadingTasks ? <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-52 animate-pulse rounded-2xl bg-white shadow-sm" />)}</div> : !tasks.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">✓</div><h2 className="text-xl font-bold">Belum ada task</h2><p className="mt-2 text-sm text-slate-500">Tambahkan pekerjaan pertama untuk project ini.</p><button onClick={openCreate} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">+ Buat Task</button></div> : <div className="grid gap-4 md:grid-cols-2">{tasks.map(task => { const sm=statusMeta[task.status]; const pm=priorityMeta[task.priority]; const overdue=isOverdue(task.dueDate,task.status); return <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-lg font-bold">{task.title}</h3>{task.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{task.description}</p>}</div><span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ' + sm.className}>{sm.icon} {sm.label}</span></div><div className="mt-4 flex flex-wrap gap-2"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + pm.className}>{pm.label}</span><span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + (overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600')}>{overdue ? '⚠ ' : '📅 '}{formatDate(task.dueDate)}</span></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><div className="flex min-w-0 flex-wrap gap-1.5">{task.assignees?.length ? task.assignees.map(a => <span key={a.userId} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{a.name || a.username || a.email || 'User'}</span>) : <span className="text-xs text-slate-400">Belum ada assignee</span>}</div><div className="flex shrink-0 gap-2"><button onClick={() => void openAssignees(task)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Assignee</button><button onClick={() => openEdit(task)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Edit</button><button onClick={() => handleDelete(task)} disabled={deletingId===task.id} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{deletingId===task.id ? '...' : 'Hapus'}</button></div></div></article>; })}</div>}
    </>}

    {assigneeTask && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) closeAssignees(); }}><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Task Assignee</p><h2 className="mt-1 text-xl font-bold">{assigneeTask.title}</h2><p className="mt-1 text-sm text-slate-500">Kelola member project yang ditugaskan pada task ini.</p></div><button type="button" onClick={closeAssignees} className="rounded-lg p-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="mb-3 text-sm font-semibold">Tambah Assignee</p><div className="flex gap-2"><select value={assigneeUserId} onChange={e => setAssigneeUserId(e.target.value)} disabled={loadingMembers || assigneeSaving} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400"><option value="">{loadingMembers ? 'Memuat member...' : 'Pilih member project'}</option>{members.filter(m => !(assigneeTask.assignees ?? []).some(a => a.userId === m.userId)).map(m => <option key={m.userId} value={m.userId}>{m.user.name || m.user.username} · {m.role}</option>)}</select><button type="button" onClick={() => void handleAddAssignee()} disabled={!assigneeUserId || assigneeSaving} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{assigneeSaving ? '...' : 'Tambah'}</button></div></div><div className="mt-5"><p className="mb-3 text-sm font-semibold">Assignee Saat Ini</p>{(assigneeTask.assignees ?? []).length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">Belum ada assignee.</p> : <div className="space-y-2">{assigneeTask.assignees.map(a => <div key={a.userId} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{a.name || a.username || a.email}</p><p className="truncate text-xs text-slate-400">{a.email || a.username}</p></div><button type="button" onClick={() => void handleRemoveAssignee(a.userId)} disabled={assigneeSaving} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Hapus</button></div>)}</div>}</div></section></div>}
  </div></main>;
}
