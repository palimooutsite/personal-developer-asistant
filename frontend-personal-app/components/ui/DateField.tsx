'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface DateFieldProps { value: string; onChange: (value: string) => void; id?: string; label?: string; }

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const WEEKDAYS = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function parseDate(value: string) { return value ? new Date(`${value}T00:00:00`) : new Date(); }
function formatDate(value: string) {
  if (!value) return 'Pilih deadline';
  return new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(parseDate(value));
}
function addDays(days:number) { const d=new Date(); d.setDate(d.getDate()+days); return toInputDate(d); }

export function DateField({ value, onChange, id, label='Deadline' }: DateFieldProps) {
  const today = toInputDate(new Date());
  const initial = parseDate(value);
  const [open,setOpen]=useState(false);
  const [viewYear,setViewYear]=useState(initial.getFullYear());
  const [viewMonth,setViewMonth]=useState(initial.getMonth());
  const ref=useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(value){const d=parseDate(value);setViewYear(d.getFullYear());setViewMonth(d.getMonth());} },[value]);
  useEffect(()=>{function close(e:MouseEvent){if(!ref.current?.contains(e.target as Node))setOpen(false);}document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[]);

  const days=useMemo(()=>{
    const first=new Date(viewYear,viewMonth,1);
    const offset=(first.getDay()+6)%7;
    const count=new Date(viewYear,viewMonth+1,0).getDate();
    const prevCount=new Date(viewYear,viewMonth,0).getDate();
    const cells:Array<{day:number;date:string;muted:boolean}>= [];
    for(let i=offset-1;i>=0;i--){const day=prevCount-i;const d=new Date(viewYear,viewMonth-1,day);cells.push({day,date:toInputDate(d),muted:true});}
    for(let day=1;day<=count;day++){const d=new Date(viewYear,viewMonth,day);cells.push({day,date:toInputDate(d),muted:false});}
    while(cells.length<42){const d=new Date(viewYear,viewMonth+1,cells.length-offset-count+1);cells.push({day:d.getDate(),date:toInputDate(d),muted:true});}
    return cells;
  },[viewYear,viewMonth]);

  const selectedDay=value?parseDate(value).getDate():0;
  const prevMonth=()=>{const d=new Date(viewYear,viewMonth-1,1);setViewYear(d.getFullYear());setViewMonth(d.getMonth());};
  const nextMonth=()=>{const d=new Date(viewYear,viewMonth+1,1);setViewYear(d.getFullYear());setViewMonth(d.getMonth());};
  const choose=(date:string)=>{onChange(date);setOpen(false);};

  return (
    <div ref={ref} className="relative">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-zinc-800">{label}</label>
      <button id={id} type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-zinc-300 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </span>
        <span className="min-w-0 flex-1"><span className={value?'block text-sm font-semibold text-zinc-800':'block text-sm font-medium text-zinc-400'}>{formatDate(value)}</span><span className="mt-0.5 block text-[11px] text-zinc-400">{value || 'Belum ditentukan'}</span></span>
        {value?<span onClick={e=>{e.stopPropagation();onChange('')}} className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus-within:ring-2 focus-within:ring-blue-100">×</span>:null}
        <svg viewBox="0 0 20 20" fill="none" className={`h-5 w-5 text-zinc-400 transition ${open?'rotate-180 text-blue-500':''}`}><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open?<div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[320px] max-w-[380px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl ring-1 ring-black/5">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={prevMonth} className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-100">‹</button>
          <div className="text-center"><p className="text-sm font-bold text-zinc-900">{MONTHS[viewMonth]}</p><p className="text-xs font-medium text-zinc-400">{viewYear}</p></div>
          <button type="button" onClick={nextMonth} className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-100">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">{WEEKDAYS.map(day=><div key={day} className="py-1 text-center text-[11px] font-bold uppercase text-zinc-400">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(cell=>{
            const isSelected=cell.date===value, isToday=cell.date===today;
            return <button key={cell.date} type="button" onClick={()=>choose(cell.date)} className={`relative flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${isSelected?'bg-blue-600 text-white shadow-sm':isToday?'bg-blue-50 font-bold text-blue-700':cell.muted?'text-zinc-300 hover:bg-zinc-50':'text-zinc-700 hover:bg-blue-50 hover:text-blue-700'}`}>
              {cell.day}{isToday&&!isSelected?<span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500"/>:null}
            </button>;
          })}
        </div>
        <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-3">
          <button type="button" onClick={()=>choose(today)} className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100">Hari ini</button>
          {value?<button type="button" onClick={()=>{onChange('');setOpen(false)}} className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-100">Hapus</button>:null}
        </div>
      </div>:null}
      <div className="mt-2 flex flex-wrap gap-2">{[{label:'Besok',days:1},{label:'7 hari',days:7},{label:'30 hari',days:30}].map(item=><button key={item.label} type="button" onClick={()=>onChange(addDays(item.days))} className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100">{item.label}</button>)}</div>
    </div>
  );
}
