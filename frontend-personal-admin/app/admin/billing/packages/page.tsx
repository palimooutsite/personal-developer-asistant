"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listPackages, seedCatalog, updatePackage, type AdminPackage } from "../../../../lib/billing";

export default function PackagesPage() {
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try { setPackages(await listPackages()); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal memuat package"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setError(""); setMessage("");
    try { await fn(); setMessage(ok); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Operasi gagal"); }
  }

  return <section className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-amber-600">Billing / Catalog</p><h2 className="mt-1 text-3xl font-bold">Packages</h2><p className="mt-2 text-sm text-zinc-500">Kelola paket, harga, feature dan limit.</p></div>
      <div className="flex gap-2">
        <button onClick={() => run(() => seedCatalog(), "Default catalog berhasil disinkronkan")} className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50">Seed Defaults</button>
      </div>
    </div>
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <p>Memuat...</p> : <div className="grid gap-5 xl:grid-cols-3">{packages.map(pkg =>
      <article key={pkg.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex justify-between gap-3">
          <div><h3 className="text-lg font-bold">{pkg.name}</h3><p className="text-xs font-semibold text-zinc-400">{pkg.code}</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${pkg.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{pkg.isActive ? "ACTIVE" : "INACTIVE"}</span>
        </div>
        <p className="mt-3 text-sm text-zinc-500">{pkg.description || "Tanpa deskripsi"}</p>
        <div className="mt-5 space-y-2">{(pkg.prices ?? []).map(price =>
          <div key={price.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3"><span className="text-sm font-semibold">{price.billingPeriod}</span><span className="text-sm font-bold">{(price.amountMinor / 100).toLocaleString("id-ID")} {price.currency}</span></div>
        )}</div>
        <div className="mt-5 border-t pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Features & Limits</p>
          <div className="space-y-2">{(pkg.features ?? []).map(item =>
            <div key={item.id} className="flex items-center justify-between text-sm"><span>{item.feature?.name ?? item.featureId}</span><span className="font-semibold text-zinc-500">{item.enabled ? (item.limitValue ?? "ON") : "OFF"}</span></div>
          )}</div>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href={`/admin/billing/packages/${pkg.id}`} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white">Manage Limits</Link>
          <button onClick={() => { const name = prompt("Nama package", pkg.name); if (name && name !== pkg.name) void run(() => updatePackage(pkg.id, { name }), "Package diperbarui"); }} className="rounded-lg border px-3 py-2 text-xs font-semibold">Edit</button>
          <button onClick={() => void run(() => updatePackage(pkg.id, { isActive: !pkg.isActive }), "Status package diperbarui")} className="rounded-lg border px-3 py-2 text-xs font-semibold">{pkg.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
        </div>
      </article>
    )}</div>}
  </section>;
}
