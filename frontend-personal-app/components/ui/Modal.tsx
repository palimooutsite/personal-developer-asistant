'use client';

import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl';
}

const MAX_WIDTH: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-5xl',
};

export function Modal({ open, title, description, onClose, children, maxWidth = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`flex max-h-[95vh] w-full flex-col overflow-hidden bg-white sm:rounded-2xl sm:shadow-2xl ${MAX_WIDTH[maxWidth]}`}>
        {(title || description) ? (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 bg-zinc-50/90 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              {title ? <h2 className="text-lg font-bold text-zinc-950">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup" className="shrink-0 rounded-lg px-3 py-2 text-xl leading-none text-zinc-400 transition hover:bg-white hover:text-zinc-800">×</button>
          </div>
        ) : null}
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
