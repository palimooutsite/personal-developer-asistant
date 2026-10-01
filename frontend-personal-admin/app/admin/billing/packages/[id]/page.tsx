"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBillingPackageFeatures, setPackageFeature, type AdminPackageFeature } from "../../../../../lib/billing";

export default function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [packageId, setPackageId] = useState("");
  const [packageName, setPackageName] = useState("");
  const [items, setItems] = useState<AdminPackageFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(id: string) {
    setLoading(true); setError("");
    try {
      const result = await getBillingPackageFeatures(id);
      setPackageName(result.package.name);
      setItems(result.features);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat feature package");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void params.then(({ id }) => { setPackageId(id); void load(id); });
  }, [params]);

  async function save(item: AdminPackageFeature, enabled: boolean, limitValue: number | null) {
    setSaving(item.featureId); setError(""); setMessage("");
    try {
      await setPackageFeature(packageId, item.featureId, { enabled, limitValue: item.feature?.valueType === "LIMIT" ? limitValue : undefined });
      setMessage(`${item.feature?.name ?? "Feature"} berhasil diperbarui.`);
      await load(packageId);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan feature"); }
    finally { setSaving(null); }
  }

  return <section className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-end justify-between gap-4">
      <div><Link href="/admin/billing/packages" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900">← Kembali ke Packages</Link><p className="mt-4 text-sm font-semibold text-amber-600">Billing / Package Configuration</p><h2 className="mt-1 text-3xl font-bold">{packageName || "Package"}</h2><p className="mt-2 text-sm text-zinc-500">Atur feature dan limit yang berlaku untuk package ini.</p></div>
    </div>
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading ? <p>Memuat...</p> : <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1fr_120px_180px_100px] gap-4 border-b bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500"><span>Feature</span><span>Enabled</span><span>Limit</span><span>Action</span></div>
      <div className="divide-y">{items.map(item => <FeatureRow key={item.featureId} item={item} saving={saving === item.featureId} onSave={save} />)}</div>
      {items.length === 0 && <div className="p-8 text-center text-sm text-zinc-500">Belum ada feature pada package ini. Jalankan Seed Defaults atau konfigurasi feature melalui backend.</div>}
    </div>}
  </section>;
}

function FeatureRow({ item, saving, onSave }: { item: AdminPackageFeature; saving: boolean; onSave: (item: AdminPackageFeature, enabled: boolean, limitValue: number | null) => Promise<void> }) {
  const [enabled, setEnabled] = useState(item.enabled);
  const [limit, setLimit] = useState(item.limitValue?.toString() ?? "");
  useEffect(() => { setEnabled(item.enabled); setLimit(item.limitValue?.toString() ?? ""); }, [item.enabled, item.limitValue]);
  const isLimit = item.feature?.valueType === "LIMIT";
  return <div className="grid grid-cols-[1fr_120px_180px_100px] items-center gap-4 px-5 py-4">
    <div><p className="font-semibold">{item.feature?.name ?? item.featureId}</p><p className="text-xs text-zinc-400">{item.feature?.code}{item.feature?.unit ? ` · ${item.feature.unit}` : ""}</p></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4" />{enabled ? "ON" : "OFF"}</label>
    <div>{isLimit ? <input type="number" min="0" value={limit} disabled={!enabled} onChange={e => setLimit(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500" placeholder="Limit" /> : <span className="text-sm text-zinc-500">Boolean feature</span>}</div>
    <button disabled={saving || (isLimit && enabled && limit === "")} onClick={() => void onSave(item, enabled, isLimit ? Number(limit) : null)} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "..." : "Save"}</button>
  </div>;
}
