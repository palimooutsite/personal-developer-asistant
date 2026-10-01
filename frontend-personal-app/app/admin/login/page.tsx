'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import { getCurrentUser, login, logout } from '../../../lib/auth';

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    void getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (user.isPlatformAdmin) {
          router.replace('/admin/billing');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const user = await getCurrentUser();

      if (!user.isPlatformAdmin) {
        logout();
        setError('Akun ini bukan administrator platform.');
        return;
      }

      router.replace('/admin/billing');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Tidak dapat terhubung ke server.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <p className="text-sm text-zinc-400">Memeriksa sesi administrator...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-zinc-950">
            PDA
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Platform Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Admin Login</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Masuk untuk mengelola konfigurasi platform dan billing global.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-zinc-200">
                Email administrator
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-zinc-200">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Platform Admin'}
            </button>
          </form>

          <div className="mt-6 border-t border-zinc-800 pt-5 text-center">
            <a href="/login" className="text-sm font-semibold text-zinc-400 hover:text-white">
              ← Kembali ke login workspace
            </a>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-600">
          Akses ini khusus administrator platform.
        </p>
      </div>
    </main>
  );
}
