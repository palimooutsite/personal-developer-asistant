'use client';

import { ReactNode } from 'react';

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export function StyledSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  id,
  ariaLabel,
}: StyledSelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className={`group relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-11 text-sm font-medium text-zinc-800 shadow-sm outline-none transition hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400 transition group-focus-within:text-blue-500">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {selected?.icon ? <span className="pointer-events-none absolute left-3 hidden items-center sm:flex">{selected.icon}</span> : null}
    </div>
  );
}
