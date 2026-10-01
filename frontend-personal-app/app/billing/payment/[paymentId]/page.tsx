'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { sandboxSucceedPayment } from '../../../../lib/billing';
import { useTenant } from '../../../../components/providers/TenantProvider';

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams<{ paymentId: string }>();
  const { activeTenantId } = useTenant();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function succeed() {
    if (!activeTenantId) return;

    setBusy(true);
    setError(null);

    try {
      await sandboxSucceedPayment(activeTenantId, params.paymentId);
      router.push('/billing/subscription');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Pembayaran gagal diproses.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-10">
      <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          Sandbox Payment
        </div>
        <h1 className="mt-3 text-3xl font-bold">Simulasi Pembayaran</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Ini adalah halaman simulasi. Belum ada pembayaran nyata yang diproses.
        </p>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          disabled={busy || !activeTenantId}
          onClick={() => void succeed()}
          className="mt-7 w-full rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Mengaktifkan...' : 'Simulasikan Pembayaran Berhasil'}
        </button>

        <Link
          href="/billing"
          className="mt-4 flex justify-center text-sm font-semibold text-zinc-500"
        >
          Batalkan
        </Link>
      </div>
    </main>
  );
}