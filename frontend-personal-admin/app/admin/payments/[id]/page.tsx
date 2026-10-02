"use client";

import { useEffect, useState } from "react";
import { getAdminPayment, type AdminPayment } from "@/lib/billing";

const money=(v:number,c:string)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:c,maximumFractionDigits:0}).format(v/100);
const dt=(v:string|null)=>v?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"-";
const labels:Record<string,string>={SUCCEEDED:"Berhasil",PENDING:"Menunggu",FAILED:"Gagal",EXPIRED:"Kedaluwarsa",CANCELLED:"Dibatalkan"};

export default function PaymentDetail({params}:{params:Promise<{id:string}>}){
 const [item,setItem]=useState<AdminPayment|null>(null); const [error,setError]=useState("");
 useEffect(()=>{params.then(p=>getAdminPayment(p.id).then(setItem).catch(e=>setError(e instanceof Error?e.message:"Payment tidak ditemukan")));},[params]);
 if(error)return <main className="p-10"><a href="/admin/payments" className="text-sm text-slate-500">← Payments</a><div className="mt-8 rounded-2xl border bg-white p-8 text-red-600">{error}</div></main>;
 if(!item)return <main className="p-10 text-sm text-slate-500">Memuat detail payment...</main>;
 return <main className="min-h-screen bg-slate-50 p-6 lg:p-10"><div className="mx-auto max-w-5xl space-y-6">
  <a href="/admin/payments" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Kembali ke Payments</a>
  <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm"><div className="text-xs uppercase tracking-[0.18em] text-slate-400">Payment Detail</div><div className="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold">{money(item.amountMinor,item.currency)}</h1><p className="mt-2 text-sm text-slate-300">{item.workspaceName} · {item.packageName}</p></div><span className="w-fit rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">{labels[item.status]||item.status}</span></div></div>
  <div className="grid gap-6 md:grid-cols-2">
   <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-semibold">Transaksi</h2><dl className="mt-5 space-y-4 text-sm">{[["Payment ID",item.id],["Provider",item.provider],["Provider Payment ID",item.providerPaymentId||"-"],["Invoice ID",item.invoiceId],["Subscription ID",item.subscriptionId]].map(([a,b])=><div key={a}><dt className="text-xs text-slate-400">{a}</dt><dd className="mt-1 break-all font-medium text-slate-800">{b}</dd></div>)}</dl></section>
   <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-semibold">Workspace & Paket</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-slate-400">Workspace</dt><dd className="mt-1 font-medium">{item.workspaceName}</dd></div><div><dt className="text-xs text-slate-400">Tenant ID</dt><dd className="mt-1 break-all">{item.tenantId}</dd></div><div><dt className="text-xs text-slate-400">Paket</dt><dd className="mt-1 font-medium">{item.packageName} ({item.packageCode})</dd></div><div><dt className="text-xs text-slate-400">Nominal</dt><dd className="mt-1 font-medium">{money(item.amountMinor,item.currency)}</dd></div></dl></section>
  </div>
  <section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-semibold">Timeline Payment</h2><div className="mt-5 grid gap-5 md:grid-cols-4">{[["Dibuat",item.createdAt],["Kedaluwarsa",item.expiresAt],["Dibayar",item.paidAt],["Checkout URL",item.checkoutUrl||"-"]].map(([a,b])=><div key={a}><div className="text-xs text-slate-400">{a}</div><div className="mt-1 break-all text-sm font-medium text-slate-800">{a==="Checkout URL"?b:dt(b)}</div></div>)}</div></section>
  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Read-only monitoring.</strong> Admin dapat memeriksa status dan relasi transaksi, tetapi tidak dapat mengubah payment dari halaman ini.</div>
 </div></main>;
}
