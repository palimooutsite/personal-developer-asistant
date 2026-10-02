"use client";

import { useEffect, useMemo, useState } from "react";
import { listAdminPayments, type AdminPayment } from "@/lib/billing";

const money=(v:number,c:string)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:c,maximumFractionDigits:0}).format(v/100);
const dt=(v:string|null)=>v?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"-";
const labels:Record<string,string>={SUCCEEDED:"Berhasil",PENDING:"Menunggu",FAILED:"Gagal",EXPIRED:"Kedaluwarsa",CANCELLED:"Dibatalkan"};
const badge=(s:string)=>s==="SUCCEEDED"?"bg-emerald-50 text-emerald-700":s==="PENDING"?"bg-amber-50 text-amber-700":s==="FAILED"?"bg-red-50 text-red-700":"bg-slate-100 text-slate-600";

export default function PaymentsPage(){
 const [items,setItems]=useState<AdminPayment[]>([]); const [q,setQ]=useState(""); const [status,setStatus]=useState("ALL"); const [loading,setLoading]=useState(true);
 useEffect(()=>{listAdminPayments().then(setItems).finally(()=>setLoading(false));},[]);
 const counts=useMemo(()=>({total:items.length,succeeded:items.filter(x=>x.status==="SUCCEEDED").length,pending:items.filter(x=>x.status==="PENDING").length,failed:items.filter(x=>x.status==="FAILED").length,expired:items.filter(x=>x.status==="EXPIRED").length,cancelled:items.filter(x=>x.status==="CANCELLED").length}),[items]);
 const filtered=useMemo(()=>items.filter(x=>(status==="ALL"||x.status===status)&&[x.id,x.invoiceId,x.workspaceName,x.packageName,x.providerPaymentId||""].join(" ").toLowerCase().includes(q.toLowerCase())),[items,q,status]);
 return <main className="min-h-screen bg-slate-50 p-6 lg:p-10">
  <div className="mx-auto max-w-7xl space-y-7">
   <div><div className="text-sm font-medium text-slate-500">Billing / Payments</div><h1 className="mt-1 text-3xl font-bold text-slate-950">Payments</h1><p className="mt-2 text-sm text-slate-500">Monitor seluruh transaksi pembayaran dari workspace. Halaman ini bersifat read-only.</p></div>
   <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{[["Total",counts.total,"ALL"],["Berhasil",counts.succeeded,"SUCCEEDED"],["Menunggu",counts.pending,"PENDING"],["Gagal",counts.failed,"FAILED"],["Kedaluwarsa",counts.expired,"EXPIRED"],["Dibatalkan",counts.cancelled,"CANCELLED"]].map(([n,v,s])=><button key={String(s)} onClick={()=>setStatus(String(s))} className={"rounded-2xl border bg-white p-4 text-left shadow-sm "+(status===s?"ring-2 ring-slate-900":"")}><div className="text-xs text-slate-500">{n}</div><div className="mt-1 text-2xl font-bold text-slate-950">{v}</div></button>)}</div>
   <div className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari payment, invoice, workspace, paket..." className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-200"/><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border px-4 py-2.5 text-sm"><option value="ALL">Semua status</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div></div>
   <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold text-slate-950">Daftar Payment</h2><p className="text-xs text-slate-500">{filtered.length} transaksi</p></div>
    {loading?<div className="p-10 text-center text-sm text-slate-500">Memuat payment...</div>:filtered.length===0?<div className="p-10 text-center text-sm text-slate-500">Tidak ada payment yang cocok.</div>:
    <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Payment</th><th>Workspace</th><th>Paket</th><th>Nominal</th><th>Status</th><th>Provider</th><th>Tanggal</th><th></th></tr></thead><tbody className="divide-y">{filtered.map(x=><tr key={x.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-medium">{x.id.slice(0,8)}…</div><div className="text-xs text-slate-400">Invoice {x.invoiceId.slice(0,8)}…</div></td><td><div className="font-medium">{x.workspaceName}</div><div className="text-xs text-slate-400">{x.tenantId.slice(0,8)}…</div></td><td>{x.packageName}<div className="text-xs text-slate-400">{x.packageCode}</div></td><td className="font-medium">{money(x.amountMinor,x.currency)}</td><td><span className={"rounded-full px-2.5 py-1 text-xs font-semibold "+badge(x.status)}>{labels[x.status]||x.status}</span></td><td>{x.provider}</td><td>{dt(x.paidAt||x.createdAt)}</td><td className="pr-5 text-right"><a href={"/admin/payments/"+x.id} className="font-medium text-slate-900 hover:underline">Detail →</a></td></tr>)}</tbody></table></div>}
   </div>
  </div>
 </main>;
}
