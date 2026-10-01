'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import { getBillingPackages, type BillingPackage, type BillingPrice } from '../../lib/billing';

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function monthlyPrice(pkg: BillingPackage): BillingPrice | null {
  return pkg.prices?.find((price) => price.isActive && price.billingPeriod === 'MONTHLY') ?? null;
}

export default function BillingPlansPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<BillingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void getBillingPackages()
      .then((items) => setPackages(items.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Paket billing tidak dapat dimuat.');
      })
      .finally(() => setLoading(false));
  }, []);

  function choosePackage(pkg: BillingPackage) {
    const price = monthlyPrice(pkg);
    if (!price) {
      setError('Harga bulanan untuk paket ini belum tersedia.');
      return;
    }

    router.push(
      '/billing/checkout-session?package=' +
        encodeURIComponent(pkg.code) +
        '&billingPeriod=MONTHLY',
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-zinc-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Choose your plan</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Pilih paket untuk workspace baru</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Kamu belum memiliki workspace. Pilih paket terlebih dahulu, lalu workspace akan dibuat
            setelah checkout berhasil.
          </p>
        </div>

        {error ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-96 animate-pulse rounded-3xl bg-zinc-200" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => {
              const price = monthlyPrice(pkg);
              return (
                <div key={pkg.id} className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold">{pkg.name}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{pkg.description}</p>
                  <div className="mt-6">
                    <span className="text-3xl font-black">
                      {price ? money(price.amountMinor, price.currency) : '—'}
                    </span>
                    <span className="ml-1 text-sm text-zinc-400">/ bulan</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3 border-t border-zinc-100 pt-6">
                    {pkg.features?.filter((feature) => feature.enabled).slice(0, 6).map((feature) => (
                      <li key={feature.id} className="flex gap-2 text-sm text-zinc-600">
                        <span className="font-bold text-emerald-500">✓</span>
                        <span>{feature.feature?.name ?? feature.featureId}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => choosePackage(pkg)}
                    disabled={!price}
                    className="mt-7 rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Pilih {pkg.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="text-sm font-semibold text-zinc-400 hover:text-zinc-700"
          >
            Kembali ke login
          </button>
        </div>
      </div>
    </main>
  );
}
