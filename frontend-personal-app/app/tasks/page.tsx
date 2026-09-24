'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProjectMembers, getProjects, Project, ProjectMember } from '../../lib/projects';
import { addTaskAssignee, createTask, deleteTask, getTasks, removeTaskAssignee, Task, TaskPriority, TaskStatus, updateTask } from '../../lib/tasks';
import { TaskStats } from '../../components/tasks/TaskStats';
import { TaskForm } from '../../components/tasks/TaskForm';
import { TaskCard } from '../../components/tasks/TaskCard';
import { TaskAssigneeModal } from '../../components/tasks/TaskAssigneeModal';
import { TaskKanbanBoard } from '../../components/tasks/TaskKanbanBoard';
import { StyledSelect } from '../../components/ui/StyledSelect';
import { ModuleHeader } from '../../components/layout/ModuleHeader';
import { Modal } from '../../components/ui/Modal';
import Link from 'next/link';

export default function TasksPage() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get('projectId');
  const [projects,setProjects]=useState<Project[]>([]);
  const [projectId,setProjectId]=useState(requestedProjectId??'');
  const [tasks,setTasks]=useState<Task[]>([]);
  const [loadingProjects,setLoadingProjects]=useState(true);
  const [loadingTasks,setLoadingTasks]=useState(false);
  const [error,setError]=useState('');
  const [formOpen,setFormOpen]=useState(false);
  const [editing,setEditing]=useState<Task|null>(null);
  const [saving,setSaving]=useState(false);
  const [deletingId,setDeletingId]=useState('');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [status,setStatus]=useState<TaskStatus>('TODO');
  const [priority,setPriority]=useState<TaskPriority>('MEDIUM');
  const [dueDate,setDueDate]=useState('');
  const [members,setMembers]=useState<ProjectMember[]>([]);
  const [assigneeTask,setAssigneeTask]=useState<Task|null>(null);
  const [loadingMembers,setLoadingMembers]=useState(false);
  const [assigneeUserId,setAssigneeUserId]=useState('');
  const [assigneeSaving,setAssigneeSaving]=useState(false);
  const [viewMode,setViewMode]=useState<'list'|'kanban'>('list');

  useEffect(()=>{(async()=>{try{setLoadingProjects(true);const data=await getProjects();setProjects(data);if(data.length&&(!requestedProjectId||!data.some(p=>p.id===requestedProjectId)))setProjectId(data[0].id);}catch(e){setError(e instanceof Error?e.message:'Gagal memuat project');}finally{setLoadingProjects(false);}})();},[requestedProjectId]);
  useEffect(()=>{if(!projectId){setTasks([]);return;}(async()=>{try{setLoadingTasks(true);setError('');setTasks(await getTasks(projectId));}catch(e){setError(e instanceof Error?e.message:'Gagal memuat task');}finally{setLoadingTasks(false);}})();},[projectId]);

  const selectedProject=projects.find(p=>p.id===projectId);
  const stats=useMemo(()=>({total:tasks.length,todo:tasks.filter(t=>t.status==='TODO').length,inProgress:tasks.filter(t=>t.status==='IN_PROGRESS').length,done:tasks.filter(t=>t.status==='DONE').length}),[tasks]);

  function resetForm(){setTitle('');setDescription('');setStatus('TODO');setPriority('MEDIUM');setDueDate('');setEditing(null);}
  function openCreate(){resetForm();setFormOpen(true);}
  function openEdit(task:Task){setEditing(task);setTitle(task.title);setDescription(task.description??'');setStatus(task.status);setPriority(task.priority);setDueDate(task.dueDate?task.dueDate.slice(0,10):'');setFormOpen(true);}
  function closeForm(){resetForm();setFormOpen(false);}

  async function handleSubmit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!projectId||!title.trim())return;try{setSaving(true);setError('');if(editing){const updated=await updateTask(projectId,editing.id,{title:title.trim(),description:description.trim()||null,status,priority,dueDate:dueDate||null});setTasks(c=>c.map(t=>t.id===updated.id?updated:t));}else{const created=await createTask(projectId,{title:title.trim(),description:description.trim()||undefined,priority,dueDate:dueDate||undefined});setTasks(c=>[created,...c]);}closeForm();}catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan task');}finally{setSaving(false);}}
  async function handleKanbanStatusChange(task:Task, nextStatus:TaskStatus){
    if(task.status===nextStatus)return;
    try{
      setError('');
      const updated=await updateTask(projectId,task.id,{status:nextStatus});
      setTasks(c=>c.map(t=>t.id===updated.id?updated:t));
    }catch(e){
      setError(e instanceof Error?e.message:'Status task gagal diperbarui');
    }
  }

  async function handleDelete(task:Task){if(!window.confirm('Hapus task "'+task.title+'"?'))return;try{setDeletingId(task.id);setError('');await deleteTask(projectId,task.id);setTasks(c=>c.filter(t=>t.id!==task.id));}catch(e){setError(e instanceof Error?e.message:'Gagal menghapus task');}finally{setDeletingId('');}}
  async function openAssignees(task:Task){setAssigneeTask(task);setAssigneeUserId('');setError('');try{setLoadingMembers(true);setMembers(await getProjectMembers(projectId));}catch(e){setError(e instanceof Error?e.message:'Gagal memuat member project');}finally{setLoadingMembers(false);}}
  function closeAssignees(){setAssigneeTask(null);setAssigneeUserId('');setMembers([]);}
  async function handleAddAssignee(){if(!assigneeTask||!assigneeUserId)return;try{setAssigneeSaving(true);setError('');await addTaskAssignee(projectId,assigneeTask.id,assigneeUserId);const m=members.find(x=>x.userId===assigneeUserId);if(m){const a={taskId:assigneeTask.id,projectId,userId:m.userId,username:m.user.username,email:m.user.email,name:m.user.name};setTasks(c=>c.map(t=>t.id===assigneeTask.id?{...t,assignees:[...(t.assignees??[]),a]}:t));setAssigneeTask(c=>c?{...c,assignees:[...(c.assignees??[]),a]}:c);}setAssigneeUserId('');}catch(e){setError(e instanceof Error?e.message:'Gagal menambahkan assignee');}finally{setAssigneeSaving(false);}}
  async function handleRemoveAssignee(userId:string){if(!assigneeTask)return;try{setAssigneeSaving(true);setError('');await removeTaskAssignee(projectId,assigneeTask.id,userId);setTasks(c=>c.map(t=>t.id===assigneeTask.id?{...t,assignees:(t.assignees??[]).filter(a=>a.userId!==userId)}:t));setAssigneeTask(c=>c?{...c,assignees:(c.assignees??[]).filter(a=>a.userId!==userId)}:c);}catch(e){setError(e instanceof Error?e.message:'Gagal menghapus assignee');}finally{setAssigneeSaving(false);}}

  return <main className="min-h-screen bg-[#f6f7fb] px-4 py-5 text-zinc-950 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 lg:py-10"><div className="mx-auto w-full max-w-[1600px]">
    <ModuleHeader
      icon="✓"
      label="TASKS"
      title="Tasks"
      subtitle="Task Management"
      description="Kelola pekerjaan project, deadline, prioritas, dan status task dalam satu tempat."
      accent="blue"
      action={
        <>
          <StyledSelect
            value={projectId}
            onChange={value=>{setProjectId(value);closeForm();}}
            disabled={loadingProjects||!projects.length}
            className="w-full sm:min-w-64 sm:w-auto"
            ariaLabel="Pilih project"
            options={projects.map(p=>({value:p.id,label:p.name}))}
          />
          <button
            type="button"
            onClick={openCreate}
            disabled={!projectId}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
          >
            + Task Baru
          </button>
        </>
      }
    />
    {error&&<div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loadingProjects?<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-28 animate-pulse rounded-2xl bg-white"/>)}</div>:!projects.length?<div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><h2 className="text-xl font-bold">Belum ada project</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Task harus berada di dalam project. Buat project terlebih dahulu.</p><Link href="/projects" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Buat Project</Link></div>:<>
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit Task' : 'Task Baru'}
        description={editing ? 'Perbarui informasi task yang dipilih.' : `Tambahkan task ke project ${selectedProject?.name ?? ''}.`}
        maxWidth="lg"
      >
        <TaskForm editing={Boolean(editing)} projectName={selectedProject?.name??''} title={title} description={description} status={status} priority={priority} dueDate={dueDate} saving={saving} onTitleChange={setTitle} onDescriptionChange={setDescription} onStatusChange={setStatus} onPriorityChange={setPriority} onDueDateChange={setDueDate} onSubmit={handleSubmit} onClose={closeForm}/>
      </Modal>
      <TaskStats tasks={tasks}/>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold">{selectedProject?.name}</h2><p className="mt-1 text-sm text-slate-500">{tasks.length} task dalam project ini</p></div>
        <div className="flex w-full rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
          <button type="button" onClick={()=>setViewMode('list')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition sm:flex-none ${viewMode==='list'?'bg-slate-900 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>☷ Normal</button>
          <button type="button" onClick={()=>setViewMode('kanban')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition sm:flex-none ${viewMode==='kanban'?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:bg-slate-50'}`}>▦ Kanban</button>
        </div>
      </div>
      {loadingTasks?<div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="h-52 animate-pulse rounded-2xl bg-white"/>)}</div>:!tasks.length?<div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><h2 className="text-xl font-bold">Belum ada task</h2><p className="mt-2 text-sm text-slate-500">Tambahkan pekerjaan pertama untuk project ini.</p><button onClick={openCreate} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">+ Buat Task</button></div>:viewMode==='kanban'?<TaskKanbanBoard tasks={tasks} deletingId={deletingId} onAssignees={openAssignees} onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleKanbanStatusChange}/>:<div className="grid gap-4 md:grid-cols-2">{tasks.map(task=><TaskCard key={task.id} task={task} deleting={deletingId===task.id} onAssignees={openAssignees} onEdit={openEdit} onDelete={handleDelete}/>)}</div>}
    </>}
    {assigneeTask&&<TaskAssigneeModal task={assigneeTask} members={members} loadingMembers={loadingMembers} saving={assigneeSaving} selectedUserId={assigneeUserId} onSelectedUserChange={setAssigneeUserId} onAdd={()=>void handleAddAssignee()} onRemove={(id)=>void handleRemoveAssignee(id)} onClose={closeAssignees}/>}
  </div></main>;
}
