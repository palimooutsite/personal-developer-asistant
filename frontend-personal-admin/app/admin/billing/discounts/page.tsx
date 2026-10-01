"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { createDiscount,listDiscounts,updateDiscount,type AdminDiscount } from "../../../../lib/billing";

const money=(n:number|null)=>n===null?"-":"Rp "+(n/100).toLocaleString("id-ID");

export default function DiscountsPage(){
 const [items,setItems]=useState<AdminDiscount[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [form,setForm]=useState({code:"",name:"",type:"PERCENTAGE",value:"",minimum:"",max:"",duration:"ONCE",cycles:"",usageLimit:"",startsAt:"",expiresAt:""});
 const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));
 async function load(){setLoading(true);try{setItems(await listDiscounts())}catch(e){setError(e instanceof Error?e.message:"Gagal memuat discount")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function create(){
  setSaving(true);setError("");setMessage("");
  try{
   const body:Record<string,unknown>={code:form.code,name:form.name,type:form.type,duration:form.duration};
   if(form.type==="PERCENTAGE") body.percentage=Number(form.value); else body.valueMinor=Math.round(Number(form.value)*100);
   if(form.minimum) body.minimumAmountMinor=Math.round(Number(form.minimum)*100);
   if(form.max&&form.type==="PERCENTAGE") body.maxDiscountMinor=Math.round(Number(form.max)*100);
   if(form.duration==="RECURRING_CYCLES") body.durationCycles=Number(form.cycles);
   if(form.usageLimit) body.usageLimit=Number(form.usageLimit);
   if(form.startsAt) body.startsAt=new Date(form.startsAt).toISOString();
   if(form.expiresAt) body.expiresAt=new Date(form.expiresAt).toISOString();
   await createDiscount(body);setMessage("Discount berhasil dibuat.");await load();
   setForm({code:"",name:"",type:"PERCENTAGE",value:"",minimum:"",max:"",duration:"ONCE",cycles:"",usageLimit:"",startsAt:"",expiresAt:""});
  }catch(e){setError(e instanceof Error?e.message:"Gagal membuat discount")}finally{setSaving(false)}
 }
 async function toggle(item:AdminDiscount){setSaving(true);setError("");try{await updateDiscount(item.id,{isActive:!item.isActive});setMessage("Status discount diperbarui.");await load()}catch(e){setError(e instanceof Error?e.message:"Gagal memperbarui discount")}finally{setSaving(false)}}
 return <section className="mx-auto max-w-7xl space-y-6">
  <div><Link href="/admin/billing" className="text-sm font-semibold text-zinc-500">← Billing</Link><p className="mt-4 text-sm font-semibold text-amber-600">Billing / Discounts</p><h2 className="mt-1 text-3xl font-bold">Discount Management</h2><p className="mt-2 text-sm text-zinc-500">Kelola kode promo, nilai, periode dan usage limit.</p></div>
  {message&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
  {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Create Discount</h3><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
   <input value={form.code} onChange={e=>set("code",e.target.value.toUpperCase())} placeholder="Code" className="rounded-lg border px-3 py-2 text-sm"/>
   <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Name" className="rounded-lg border px-3 py-2 text-sm"/>
   <select value={form.type} onChange={e=>set("type",e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option>PERCENTAGE</option><option>FIXED_AMOUNT</option></select>
   <input type="number" min="0" value={form.value} onChange={e=>set("value",e.target.value)} placeholder={form.type==="PERCENTAGE"?"Percentage 1-100":"Amount (Rupiah)"} className="rounded-lg border px-3 py-2 text-sm"/>
   <input type="number" min="0" value={form.minimum} onChange={e=>set("minimum",e.target.value)} placeholder="Minimum transaksi (Rp)" className="rounded-lg border px-3 py-2 text-sm"/>
   {form.type==="PERCENTAGE"&&<input type="number" min="0" value={form.max} onChange={e=>set("max",e.target.value)} placeholder="Max discount (Rp)" className="rounded-lg border px-3 py-2 text-sm"/>}
   <select value={form.duration} onChange={e=>set("duration",e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option>ONCE</option><option>RECURRING_CYCLES</option><option>FOREVER</option></select>
   {form.duration==="RECURRING_CYCLES"&&<input type="number" min="1" value={form.cycles} onChange={e=>set("cycles",e.target.value)} placeholder="Cycles" className="rounded-lg border px-3 py-2 text-sm"/>}
   <input type="number" min="1" value={form.usageLimit} onChange={e=>set("usageLimit",e.target.value)} placeholder="Usage limit" className="rounded-lg border px-3 py-2 text-sm"/>
   <input type="datetime-local" value={form.startsAt} onChange={e=>set("startsAt",e.target.value)} className="rounded-lg border px-3 py-2 text-sm"/>
   <input type="datetime-local" value={form.expiresAt} onChange={e=>set("expiresAt",e.target.value)} className="rounded-lg border px-3 py-2 text-sm"/>
   <button onClick={()=>void create()} disabled={saving||!form.code||!form.name||!form.value} className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?"Menyimpan...":"Create Discount"}</button>
  </div></div>
  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"><div className="grid grid-cols-[1fr_150px_150px_130px_110px] gap-4 border-b bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500"><span>Discount</span><span>Value</span><span>Duration</span><span>Usage</span><span>Status</span></div>
   {loading?<div className="p-8 text-sm text-zinc-500">Memuat...</div>:items.map(item=><div key={item.id} className="grid grid-cols-[1fr_150px_150px_130px_110px] items-center gap-4 border-b px-5 py-4 last:border-0"><div><p className="font-bold">{item.code}</p><p className="text-sm text-zinc-600">{item.name}</p><p className="text-xs text-zinc-400">{item.type}</p></div><div className="text-sm font-semibold">{item.type==="PERCENTAGE"?String(item.percentage)+"%":money(item.valueMinor)}{item.maxDiscountMinor!==null&&<p className="text-xs text-zinc-400">Max {money(item.maxDiscountMinor)}</p>}</div><div className="text-sm">{item.duration}{item.durationCycles?" · "+item.durationCycles+" cycles":""}</div><div className="text-sm">{item.usageCount}{item.usageLimit!==null?" / "+item.usageLimit:" / ∞"}</div><button onClick={()=>void toggle(item)} disabled={saving} className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold">{item.isActive?"ACTIVE":"INACTIVE"}</button></div>)}
   {!loading&&items.length===0&&<div className="p-8 text-center text-sm text-zinc-500">Belum ada discount.</div>}
  </div>
 </section>;
}