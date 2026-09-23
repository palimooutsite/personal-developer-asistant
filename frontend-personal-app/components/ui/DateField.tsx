'use client';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
}

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toInputDate(date);
}

function formatDate(value: string) {
  if (!value) return 'Pilih deadline';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function DateField({ value, onChange, id, label = 'Deadline' }: DateFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-zinc-800">{label}</label>
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M16 3v4M8 3v4M3 10h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className={value ? 'text-sm font-semibold text-zinc-800' : 'text-sm font-medium text-zinc-400'}>
              {formatDate(value)}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">{value ? value : 'Belum ditentukan'}</p>
          </div>
          {value ? (
            <button type="button" onClick={() => onChange('')} className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="Hapus deadline">×</button>
          ) : null}
          <input
            id={id}
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {[{ label: 'Hari ini', days: 0 }, { label: 'Besok', days: 1 }, { label: '7 hari', days: 7 }].map((item) => (
          <button key={item.label} type="button" onClick={() => onChange(addDays(item.days))} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${value === addDays(item.days) ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 bg-white text-zinc-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
