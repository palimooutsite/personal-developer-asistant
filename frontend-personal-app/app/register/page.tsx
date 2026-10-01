'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import { register } from '../../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const invitation = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('invitation') ||
      window.sessionStorage.getItem('pda_pending_invitation_token')
    : null;
  const selectedPlan = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('plan')
    : null;
  const selectedBillingPeriod = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('billingPeriod')
    : null;
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);

    try {
      await register(username.trim(), email.trim(), password, name);
      const params = new URLSearchParams({ registered: '1' });
      if (invitation) params.set('invitation', invitation);
      if (selectedPlan) params.set('plan', selectedPlan.toUpperCase());
      if (selectedBillingPeriod) params.set('billingPeriod', selectedBillingPeriod.toUpperCase());
      router.replace('/login?' + params.toString());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Tidak dapat terhubung ke server.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="mb-8">
          <p className="text-sm font-medium text-zinc-500">
            Personal Developer Assistant
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
            Register
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Buat akun baru untuk mulai menggunakan aplikasi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-800">
              Nama
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={100}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              placeholder="Nama Anda"
            />
          </div>

          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-zinc-800">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              maxLength={50}
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              placeholder="developer"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-800">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={255}
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-800">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={100}
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              placeholder="Minimal 8 karakter"
            />
          </div>

          <div>
            <label htmlFor="passwordConfirmation" className="mb-2 block text-sm font-medium text-zinc-800">
              Konfirmasi Password
            </label>
            <input
              id="passwordConfirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
              placeholder="Ulangi password"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Membuat akun...' : 'Register'}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Sudah punya akun?{' '}
            <a
              href={invitation ? `/login?invitation=${encodeURIComponent(invitation)}` : '/login'}
              className="font-semibold text-zinc-950 hover:underline"
            >
              Login
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
