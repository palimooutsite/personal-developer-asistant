'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, apiRequest } from '../lib/api';
import { CurrentUser, getCurrentUser, logout } from '../lib/auth';

type DashboardSummary = {
  projects: { total: number; byStatus: Record<string, number> };
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  knowledge: { total: number };
  snippets: { total: number; byLanguage: Record<string, number> };
  tags: { total: number };
};

const modules = [
  { title: 'Projects', href: '/projects', description: 'Kelola project development, status, dan anggota tim.', icon: '▦', accent: 'indigo' },
  { title: 'Tasks', href: '/tasks', description: 'Atur pekerjaan, prioritas, deadline, dan progress.', icon: '✓', accent: 'blue' },
  { title: 'Knowledge', href: '/knowledge', description: 'Simpan dokumentasi, catatan teknis, dan pengetahuan.', icon: '◈', accent: 'violet' },
  { title: 'Code Snippets', href: '/snippets', description: 'Simpan potongan kode agar mudah digunakan kembali.', icon: '</>', accent: 'emerald' },
  { title: 'Documents', href: '/documents', description: 'Kelola dokumen dan file yang berkaitan dengan pekerjaan.', icon: '▤', accent: 'amber' },
  { title: 'Workspace Settings', href: '/workspace-settings', description: 'Ubah nama workspace dan kelola anggota serta role akses.', icon: '⚙', accent: 'cyan' },
] as const;

const statCards = [
  { key: 'projects', label: 'Projects', href: '/projects', icon: '▦', accent: 'indigo' },
  { key: 'tasks', label: 'Tasks', href: '/tasks', icon: '✓', accent: 'blue' },
  { key: 'knowledge', label: 'Knowledge', href: '/knowledge', icon: '◈', accent: 'violet' },
  { key: 'snippets', label: 'Snippets', href: '/snippets', icon: '</>', accent: 'emerald' },
] as const;

const accentClasses = {
  indigo: { icon: 'bg-indigo-50 text-indigo-600', ring: 'hover:border-indigo-200', link: 'text-indigo-600' },
  blue: { icon: 'bg-blue-50 text-blue-600', ring: 'hover:border-blue-200', link: 'text-blue-600' },
  violet: { icon: 'bg-violet-50 text-violet-600', ring: 'hover:border-violet-200', link: 'text-violet-600' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', ring: 'hover:border-emerald-200', link: 'text-emerald-600' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'hover:border-amber-200', link: 'text-amber-600' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600', ring: 'hover:border-cyan-200', link: 'text-cyan-600' },
} as const;

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setSummaryError(false);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setSummary(await apiRequest<DashboardSummary>('/dashboard/summary'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/login');
        return;
      }
      setSummaryError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalTaskDone = useMemo(() => summary?.tasks.byStatus?.DONE ?? 0, [summary]);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7fb] p-6 sm:p-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="h-7 w-44 animate-pulse rounded-lg bg-zinc-200/80" />
          <div className="mt-4 h-12 w-80 max-w-full animate-pulse rounded-xl bg-zinc-200/80" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/70" />)}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/70" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-zinc-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 2xl:px-10 lg:py-10">
        <header className="flex flex-col gap-6 border-b border-zinc-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              DASHBOARD
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-4xl">
              Selamat datang{user?.name ? ', ' + user.name : ''}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
              Semua aktivitas development kamu dalam satu tempat.
            </p>
          </div>
          <button type="button" onClick={handleLogout} className="self-start rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:self-auto">
            Logout
          </button>
        </header>

        <section className="mt-7 sm:mt-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Overview</p>
              <h2 className="mt-1 text-xl font-bold">Ringkasan Aktivitas</h2>
            </div>
            {summary && <p className="text-sm text-zinc-400">{totalTaskDone} task selesai</p>}
          </div>

          {summaryError ? (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <span>Ringkasan dashboard belum dapat dimuat. Menu utama tetap bisa digunakan.</span>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Memuat...' : 'Coba lagi'}
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => {
                const styles = accentClasses[card.accent];
                const value =
                  card.key === 'projects' ? summary?.projects.total ?? 0 :
                  card.key === 'tasks' ? summary?.tasks.total ?? 0 :
                  card.key === 'knowledge' ? summary?.knowledge.total ?? 0 :
                  summary?.snippets.total ?? 0;

                return (
                  <Link key={card.key} href={card.href} className={'group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ' + styles.ring}>
                    <div className="flex items-center justify-between">
                      <div className={'flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ' + styles.icon}>{card.icon}</div>
                      <span className={'text-xs font-semibold opacity-0 transition group-hover:opacity-100 ' + styles.link}>Buka →</span>
                    </div>
                    <p className="mt-5 text-sm font-medium text-zinc-500">{card.label}</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {summary && (
          <section className="mt-7 grid gap-4 lg:mt-8 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Task Status</p>
              <div className="mt-5 space-y-4">
                {Object.entries(summary.tasks.byStatus).map(([status, count]) => {
                  const styles =
                    status === 'DONE'
                      ? { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' }
                      : status === 'IN_PROGRESS'
                        ? { badge: 'bg-blue-50 text-blue-700 ring-blue-200', bar: 'bg-blue-500' }
                        : status === 'REVIEW'
                          ? { badge: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500' }
                          : status === 'CANCELLED'
                            ? { badge: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' }
                            : { badge: 'bg-zinc-50 text-zinc-600 ring-zinc-200', bar: 'bg-zinc-400' };
                  const percentage = summary.tasks.total > 0
                    ? Math.round((count / summary.tasks.total) * 100)
                    : 0;

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-700">{status.replace('_', ' ')}</span>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ring-1 ${styles.badge}`}>
                          {count} <span className="font-medium opacity-70">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Task Priority</p>
              <div className="mt-5 space-y-4">
                {Object.entries(summary.tasks.byPriority).map(([priority, count]) => {
                  const styles =
                    priority === 'URGENT'
                      ? { badge: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' }
                      : priority === 'HIGH'
                        ? { badge: 'bg-orange-50 text-orange-700 ring-orange-200', bar: 'bg-orange-500' }
                        : priority === 'MEDIUM'
                          ? { badge: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500' }
                          : { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' };
                  const percentage = summary.tasks.total > 0
                    ? Math.round((count / summary.tasks.total) * 100)
                    : 0;

                  return (
                    <div key={priority}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-700">{priority}</span>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ring-1 ${styles.badge}`}>
                          {count} <span className="font-medium opacity-70">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Resources</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-zinc-600">Tags</span><span className="font-semibold">{summary.tags.total}</span></div>
                <div className="flex items-center justify-between"><span className="text-zinc-600">Documents</span><span className="text-xs text-zinc-400">Kelola di Documents</span></div>
                <div className="flex items-center justify-between"><span className="text-zinc-600">Snippets</span><span className="font-semibold">{summary.snippets.total}</span></div>
              </div>
            </div>
          </section>
        )}


        <section className="mt-8 sm:mt-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Main Menu</p>
            <h2 className="mt-1 text-xl font-bold">Workspace</h2>
            <p className="mt-1 text-sm text-zinc-500">Pilih modul yang ingin kamu gunakan.</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const styles = accentClasses[module.accent];
              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className={'group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ' + styles.ring}
                >
                  <div className="flex items-start justify-between">
                    <div className={'flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ' + styles.icon}>
                      {module.icon}
                    </div>
                    <span className={'translate-x-0 text-zinc-300 transition group-hover:translate-x-1 ' + styles.link}>→</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{module.description}</p>
                  <div className={'mt-5 text-sm font-semibold ' + styles.link}>Buka {module.title} →</div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}