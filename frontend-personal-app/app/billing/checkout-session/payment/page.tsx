'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '../../../../../lib/api';
import { sandboxSucceedCheckoutSession } from '../../../../../lib/billing';
import { setActiveTenantId } from '../../../../../lib/tenant';

export default function CheckoutSessionPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function succeed() {
    if (!sessionId) {
      setError('Checkout session tidak ditemukan.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await sandboxSucceedCheckoutSession(sessionId);
      setActiveTenantId(result.tenantId);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Pembayaran gagal diproses.');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 text-zinc-950 sm:px-6">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">
          Sandbox Payment
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          Simulasi Pembayaran
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Ini masih mode sandbox. Setelah pembayaran berhasil, sistem akan membuat
          workspace, OWNER, subscription, invoice, dan payment dalam satu transaksi.
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy || !sessionId}
          onClick={() => void succeed()}
          className="mt-8 w-full rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Menyelesaikan pembayaran...' : 'Simulasikan Pembayaran Berhasil'}
        </button>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Tidak ada pembayaran nyata yang diproses.
        </p>
      </div>
    </main>
  );
}
