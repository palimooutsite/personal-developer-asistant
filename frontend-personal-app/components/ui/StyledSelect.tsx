'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface SelectOption { value: string; label: string; icon?: ReactNode; description?: string; }
interface StyledSelectProps {
  value: string; onChange: (value: string) => void; options: SelectOption[];
  placeholder?: string; disabled?: boolean; className?: string; id?: string; ariaLabel?: string;
}

export function StyledSelect({ value, onChange, options, placeholder='Pilih...', disabled=false, className='', id, ariaLabel }: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button id={id} type="button" disabled={disabled} aria-label={ariaLabel} aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-800 shadow-sm outline-none transition hover:border-zinc-300 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400">
        {selected?.icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">{selected.icon}</span> : null}
        <span className="min-w-0 flex-1">
          <span className={selected ? 'block truncate' : 'block truncate text-zinc-400'}>{selected?.label ?? placeholder}</span>
          {selected?.description ? <span className="mt-0.5 block truncate text-[11px] text-zinc-400">{selected.description}</span> : null}
        </span>
        <svg viewBox="0 0 20 20" fill="none" className={`h-5 w-5 shrink-0 text-zinc-400 transition ${open ? 'rotate-180 text-blue-500' : ''}`}><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5">
          <div className="max-h-64 overflow-y-auto">
            {options.length ? options.map(option => (
              <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${option.value === value ? 'bg-blue-50 text-blue-700' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                {option.icon ? <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${option.value === value ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-500'}`}>{option.icon}</span> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{option.label}</span>
                  {option.description ? <span className="block truncate text-[11px] text-zinc-400">{option.description}</span> : null}
                </span>
                {option.value === value ? <span className="text-sm font-bold text-blue-600">✓</span> : null}
              </button>
            )) : <p className="px-3 py-4 text-center text-sm text-zinc-400">Tidak ada pilihan</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
