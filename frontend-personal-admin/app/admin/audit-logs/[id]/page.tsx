"use client";
import { useEffect, useState } from "react";
import { getAuditLog, type AdminAuditLog } from "@/lib/audit";

const dt=(v:string)=>new Intl.DateTimeFormat("id-ID",{dateStyle:"full",timeStyle:"medium"}).format(new Date(v));
export default function AuditLogDetail({params}:{params:Promise<{id:string}>}){
 const [item,setItem]=useState<AdminAuditLog|null>(null); const [error,setError]=useState("");
 useEffect(()=>{params.then(p=>getAuditLog(p.id).then(setItem).catch(e=>setError(e instanceof Error?e.message:"Audit log tidak ditemukan")));},[params]);
 if(error)return <main className="p-10"><a href="/admin/audit-logs" className="text-sm text-slate-500">← Audit Logs</a><div className="mt-8 rounded-2xl border bg-white p-8 text-red-600">{error}</div></main>;
 if(!item)return <main className="p-10 text-sm text-slate-500">Memuat detail audit log...</main>;
 return <main className="min-h-screen bg-slate-50 p-6 lg:p-10"><div className="mx-auto max-w-5xl space-y-6">
  <a href="/admin/audit-logs" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Kembali ke Audit Logs</a>
  <div className="rounded-3xl bg-slate-950 p-7 text-white"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Audit Log Detail</div><h1 className="mt-2 text-2xl font-bold">{item.description||item.action}</h1><p className="mt-2 text-sm text-slate-300">{dt(item.createdAt)}</p></div>
  <div className="grid gap-6 md:grid-cols-2"><section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-semibold">Aktivitas</h2><dl className="mt-5 space-y-4 text-sm">{[["Action",item.action],["Entity",item.entity],["Entity ID",item.entityId||"-"],["Description",item.description||"-"]].map(([a,b])=><div key={a}><dt className="text-xs text-slate-400">{a}</dt><dd className="mt-1 break-all font-medium text-slate-800">{b}</dd></div>)}</dl></section>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-semibold">Actor & Workspace</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-slate-400">Actor</dt><dd className="mt-1 font-medium">{item.userName||item.userEmail||"System"}</dd></div><div><dt className="text-xs text-slate-400">Email</dt><dd className="mt-1">{item.userEmail||"-"}</dd></div><div><dt className="text-xs text-slate-400">Workspace</dt><dd className="mt-1 font-medium">{item.workspaceName||"-"}</dd></div><div><dt className="text-xs text-slate-400">IP Address</dt><dd className="mt-1">{item.ipAddress||"-"}</dd></div></dl></section></div>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-semibold">Metadata</h2><pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-5 text-xs text-slate-200">{JSON.stringify(item.metadata??{},null,2)}</pre></section>
  <div className="rounded-2xl border bg-white p-5 text-sm text-slate-600"><strong>User Agent:</strong> {item.userAgent||"-"}</div>
 </div></main>;
}