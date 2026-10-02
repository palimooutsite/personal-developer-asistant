"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAuditLogs, type AdminAuditLog } from "@/lib/audit";

const dt=(v:string)=>new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
const actionLabel=(v:string)=>v.replaceAll("_"," ").replaceAll("."," / ");
const actionTone=(v:string)=>v.includes("FAILED")?"bg-red-50 text-red-700":v.includes("SUCCESS")||v.includes("CREATED")?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-700";

export default function AuditLogsPage(){
 const [items,setItems]=useState<AdminAuditLog[]>([]); const [q,setQ]=useState(""); const [entity,setEntity]=useState("ALL"); const [loading,setLoading]=useState(true);
 const load=()=>{setLoading(true);listAuditLogs({q:q||undefined,entity:entity==="ALL"?undefined:entity}).then(setItems).finally(()=>setLoading(false));};
 useEffect(()=>{load();},[]);
 const entities=useMemo(()=>Array.from(new Set(items.map(x=>x.entity))).sort(),[items]);
 return <main className="min-h-screen bg-slate-50 p-6 lg:p-10"><div className="mx-auto max-w-7xl space-y-7">
  <div><div className="text-sm font-medium text-slate-500">Platform / Audit Logs</div><h1 className="mt-1 text-3xl font-bold text-slate-950">Audit Logs</h1><p className="mt-2 text-sm text-slate-500">Riwayat aktivitas penting platform dan workspace untuk monitoring serta penelusuran.</p></div>
  <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-xs text-slate-500">Total Log</div><div className="mt-1 text-2xl font-bold">{items.length}</div></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-xs text-slate-500">Actor</div><div className="mt-1 text-2xl font-bold">{new Set(items.map(x=>x.userId).filter(Boolean)).size}</div></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="text-xs text-slate-500">Entity</div><div className="mt-1 text-2xl font-bold">{entities.length}</div></div></div>
  <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="Cari action, entity, actor, workspace..." className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"/><select value={entity} onChange={e=>{setEntity(e.target.value);setTimeout(load,0)}} className="rounded-xl border px-4 py-2.5 text-sm"><option value="ALL">Semua entity</option>{entities.map(x=><option key={x}>{x}</option>)}</select><button onClick={load} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Refresh</button></div></div>
  <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">Activity Timeline</h2><p className="text-xs text-slate-500">{items.length} aktivitas</p></div>
   {loading?<div className="p-10 text-center text-sm text-slate-500">Memuat audit logs...</div>:items.length===0?<div className="p-10 text-center text-sm text-slate-500">Belum ada aktivitas yang tercatat.</div>:
   <div className="divide-y">{items.map(x=><Link href={"/admin/audit-logs/"+x.id} key={x.id} className="block px-5 py-4 hover:bg-slate-50"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-900"/><div><div className="font-semibold text-slate-900">{x.description||actionLabel(x.action)}</div><div className="mt-1 text-sm text-slate-500">{x.userName||x.userEmail||"System"}{x.workspaceName?" · "+x.workspaceName:""} · {x.entity}{x.entityId?" · "+x.entityId.slice(0,8)+"…":""}</div></div></div><div className="flex items-center gap-3 md:pl-6"><span className={"rounded-full px-2.5 py-1 text-xs font-semibold "+actionTone(x.action)}>{actionLabel(x.action)}</span><span className="text-xs text-slate-400">{dt(x.createdAt)}</span></div></div></Link>)}</div>}
  </div></div></main>;
}