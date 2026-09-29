'use client';

import { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../lib/tasks';

const COLUMNS: Array<{status:TaskStatus;label:string;className:string}> = [
  {status:'TODO',label:'To Do',className:'border-slate-200 bg-slate-50'},
  {status:'IN_PROGRESS',label:'In Progress',className:'border-blue-200 bg-blue-50/60'},
  {status:'REVIEW',label:'Review',className:'border-amber-200 bg-amber-50/60'},
  {status:'DONE',label:'Done',className:'border-emerald-200 bg-emerald-50/60'},
  {status:'CANCELLED',label:'Cancelled',className:'border-red-200 bg-red-50/60'},
];

const priority:Record<TaskPriority,string>={LOW:'bg-slate-100 text-slate-600',MEDIUM:'bg-blue-100 text-blue-700',HIGH:'bg-orange-100 text-orange-700',URGENT:'bg-red-100 text-red-700'};

const date=(v:string|null)=>v?new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short'}).format(new Date(v)):'Tanpa deadline';
const overdue=(v:string|null,s:TaskStatus)=>Boolean(v&&s!=='DONE'&&s!=='CANCELLED'&&new Date(v)<new Date());

interface Props{
  tasks:Task[];
  deletingId:string;
  onAssignees?:(task:Task)=>void;
  onEdit?:(task:Task)=>void;
  onDelete?:(task:Task)=>void;
  onStatusChange:(task:Task,status:TaskStatus)=>Promise<void>;
}

export function TaskKanbanBoard({tasks,deletingId,onAssignees,onEdit,onDelete,onStatusChange}:Props){
  const [draggedId,setDraggedId]=useState<string|null>(null);
  const [dragOver,setDragOver]=useState<TaskStatus|null>(null);

  return <div className="overflow-x-auto pb-3">
    <div className="grid min-w-[1180px] grid-cols-5 gap-4">
      {COLUMNS.map(column=>{
        const columnTasks=tasks.filter(task=>task.status===column.status);
        return <section key={column.status} className={`min-h-[420px] rounded-2xl border ${column.className} ${dragOver===column.status?'ring-2 ring-blue-300':''}`}
          onDragOver={event=>{event.preventDefault();setDragOver(column.status);}}
          onDragLeave={()=>setDragOver(current=>current===column.status?null:current)}
          onDrop={async event=>{event.preventDefault();const task=tasks.find(item=>item.id===event.dataTransfer.getData('text/task-id'));setDragOver(null);setDraggedId(null);if(task)await onStatusChange(task,column.status);}}>
          <div className="sticky top-0 flex items-center justify-between rounded-t-2xl border-b border-inherit bg-white/80 px-4 py-3 backdrop-blur">
            <h3 className="text-sm font-bold text-slate-800">{column.label}</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">{columnTasks.length}</span>
          </div>
          <div className="space-y-3 p-3">
            {columnTasks.map(task=>{
              const late=overdue(task.dueDate,task.status);
              return <article key={task.id} draggable onDragStart={event=>{event.dataTransfer.setData('text/task-id',task.id);event.dataTransfer.effectAllowed='move';setDraggedId(task.id);}} onDragEnd={()=>{setDraggedId(null);setDragOver(null);}}
                className={`cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition active:cursor-grabbing hover:shadow-md ${draggedId===task.id?'opacity-50':''}`}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="min-w-0 break-words text-sm font-bold text-slate-900">{task.title}</h4>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${priority[task.priority]}`}>{task.priority}</span>
                </div>
                {task.description&&<p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{task.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${late?'bg-red-50 text-red-700':'bg-slate-100 text-slate-500'}`}>{late?'⚠ ':'📅 '}{date(task.dueDate)}</span>
                  {task.assignees?.slice(0,2).map(a=><span key={a.userId} className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{a.name||a.username||a.email||'User'}</span>)}
                  {(task.assignees?.length??0)>2&&<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">+{task.assignees!.length-2}</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-3">
                  {onAssignees ? <button type="button" onClick={()=>onAssignees(task)} className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50">Assign</button> : null}
                  {onEdit ? <button type="button" onClick={()=>onEdit(task)} className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100">Edit</button> : null}
                  {onDelete ? <button type="button" disabled={deletingId===task.id} onClick={()=>onDelete(task)} className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Hapus</button> : null}
                </div>
              </article>;
            })}
            {!columnTasks.length&&<div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-4 py-10 text-center text-xs text-slate-400">Drop task di sini</div>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
