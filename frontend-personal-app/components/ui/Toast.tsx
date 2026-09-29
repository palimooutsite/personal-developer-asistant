'use client';

interface ToastProps {
  message: string;
  open: boolean;
  onClose?: () => void;
}

export function Toast({ message, open, onClose }: ToastProps) {
  if (!open) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[70] w-[calc(100%-2rem)] max-w-sm" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 shadow-xl shadow-zinc-900/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">✓</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900">Berhasil</p>
          <p className="mt-0.5 text-sm text-zinc-500">{message}</p>
        </div>
        {onClose ? <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Tutup notifikasi">×</button> : null}
      </div>
    </div>
  );
}