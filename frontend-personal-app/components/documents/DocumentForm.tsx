'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

interface DocumentFormProps {
  onSubmit: (file: File, title: string, description: string) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const ACCEPT = '.pdf,.docx,.txt,.md';

export function DocumentForm({
  onSubmit,
  onCancel,
  submitting = false,
}: DocumentFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && !title) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  }, [file, title]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Pilih file terlebih dahulu.');
      return;
    }
    if (!title.trim()) {
      setError('Judul document wajib diisi.');
      return;
    }
    if (title.length > 200 || description.length > 1000) {
      setError('Panjang input melebihi batas yang ditentukan.');
      return;
    }

    setError('');
    try {
      await onSubmit(file, title.trim(), description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document gagal diunggah.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-zinc-900">Upload Document</h2>
        <p className="mt-1 text-sm text-zinc-500">Format yang didukung: PDF, DOCX, TXT, dan Markdown. Maksimal 10 MB.</p>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-6 py-8 text-center transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700">↑</span>
        <span className="mt-3 block text-sm font-bold text-zinc-800">{file ? file.name : 'Pilih file document'}</span>
        <span className="mt-1 block text-xs text-zinc-400">{file ? formatSize(file.size) : 'Klik untuk memilih file'}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={submitting}
        onChange={event => setFile(event.target.files?.[0] ?? null)}
      />

      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-700">Judul</span>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
            placeholder="Contoh: Dokumentasi API PDA"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-50" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-700">Deskripsi <span className="font-normal text-zinc-400">(opsional)</span></span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={3}
            placeholder="Catatan singkat tentang document..."
            className="w-full resize-y rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-50" />
        </label>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={submitting}
          className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">Batal</button>
        <button type="submit" disabled={submitting}
          className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Mengunggah...' : 'Upload Document'}
        </button>
      </div>
    </form>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
