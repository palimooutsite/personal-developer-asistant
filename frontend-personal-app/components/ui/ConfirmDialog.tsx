'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
        <div className="p-6 sm:p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-lg font-bold text-red-600">!</div>
          <h2 className="mt-5 text-lg font-bold text-zinc-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/80 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Menghapus...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}