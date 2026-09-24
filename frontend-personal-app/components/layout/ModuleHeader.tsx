import Link from 'next/link';
import type { ReactNode } from 'react';

type ModuleAccent = 'indigo' | 'blue' | 'violet' | 'emerald' | 'amber' | 'cyan';

interface ModuleHeaderProps {
  icon: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  accent?: ModuleAccent;
  action?: ReactNode;
}

const ACCENT_STYLES: Record<ModuleAccent, string> = {
  indigo: 'bg-indigo-950',
  blue: 'bg-blue-950',
  violet: 'bg-violet-950',
  emerald: 'bg-emerald-950',
  amber: 'bg-amber-950',
  cyan: 'bg-cyan-950',
};

export function ModuleHeader({
  icon,
  label,
  title,
  subtitle,
  description,
  accent = 'indigo',
  action,
}: ModuleHeaderProps) {
  return (
    <header className="mb-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200"
      >
        ← Kembali ke Menu
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div
            className={`mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm ${ACCENT_STYLES[accent]}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15 text-[10px]">
              {icon}
            </span>
            {label}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">{title}</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {subtitle}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
            {description}
          </p>
        </div>

        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
    </header>
  );
}
