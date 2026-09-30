'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [invitation, setInvitation] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryInvitation = params.get('invitation');
    const pendingInvitation = window.sessionStorage.getItem('pda_pending_invitation_token');
    setInvitation(queryInvitation || pendingInvitation);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const invitation =
        new URLSearchParams(window.location.search).get('invitation') ||
        window.sessionStorage.getItem('pda_pending_invitation_token');
      router.replace(
        invitation
          ? `/invitations/accept?token=${encodeURIComponent(invitation)}`
          : '/workspace-selection',
      );
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-8">
          <p className="text-sm font-medium text-zinc-500">Personal Developer Assistant</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Login</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Masuk untuk memilih workspace dan melanjutkan ke dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-800">Email</label>
            <input id="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200" placeholder="developer@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-800">Password</label>
            <input id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200" placeholder="••••••••" />
          </div>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Memproses...' : 'Login'}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Belum punya akun?{' '}
            <a href={`/register${invitation ? `?invitation=${encodeURIComponent(invitation)}` : ''}`} className="font-semibold text-zinc-950 hover:underline">
              Register
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
