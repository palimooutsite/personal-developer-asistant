'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '../../../lib/api';
import { getBillingPackages, type BillingPackage } from '../../../lib/billing';
import { getCurrentUser } from '../../../lib/auth';

export default function PlatformBillingPage() {
  const [packages, setPackages] = useState<BillingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user.isPlatformAdmin) {
          if (mounted) setForbidden(true);
          return;
        }

        const result = await getBillingPackages();
        if (mounted) setPackages(result);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : 'Data billing platform tidak dapat dimuat.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
        <div className="mx-auto max-w-6xl rounded-3xl border bg-white p-8">
          <p className="text-sm text-zinc-500">Memuat Platform Billing...</p>
        </div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Akses ditolak</p>
          <h1 className="mt-2 text-2xl font-bold">Platform Billing</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Halaman ini hanya dapat diakses oleh administrator platform.
          </p>
          <Link href="/billing" className="mt-5 inline-flex text-sm font-semibold text-cyan-700">
            Kembali ke Billing Workspace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Platform Administration
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-950">Platform Billing</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Kelola katalog billing global yang digunakan oleh seluruh workspace.
            </p>
          </div>
          <Link
            href="/billing"
            className="inline-flex w-fit rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Billing Workspace
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Packages', 'Paket subscription dan urutannya'],
            ['Features', 'Feature dan limit yang tersedia'],
            ['Prices', 'Harga monthly dan yearly'],
            ['Discounts', 'Kode promo dan aturan discount'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-zinc-900">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
              <span className="mt-4 inline-flex rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
                Platform only
              </span>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Subscription Packages</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Katalog package global yang tersedia untuk workspace.
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {packages.length} package
            </span>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-zinc-400">
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Sort</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b last:border-0">
                    <td className="px-3 py-4 font-mono text-xs">{pkg.code}</td>
                    <td className="px-3 py-4 font-semibold">{pkg.name}</td>
                    <td className="px-3 py-4">
                      <span className={pkg.isActive ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500'}>
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-zinc-500">{pkg.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
