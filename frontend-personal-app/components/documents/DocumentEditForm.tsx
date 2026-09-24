'use client';

import { FormEvent, useState } from 'react';
import type { DocumentItem } from '../../lib/documents';

interface DocumentEditFormProps {
  document: DocumentItem;
  onSubmit: (title: string, description: string) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function DocumentEditForm({
  document,
  onSubmit,
  onCancel,
  submitting = false,
}: DocumentEditFormProps) {
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description ?? '');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

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
      await onSubmit(title.trim(), description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document gagal diperbarui.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
          Edit Document
        </p>
        <h2 className="mt-1 text-lg font-bold text-zinc-900">{document.fileName}</h2>
        <p className="mt-1 text-sm text-zinc-500">
          File tetap sama. Anda hanya mengubah informasi document.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-700">Judul</span>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            maxLength={200}
            disabled={submitting}
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:bg-zinc-50"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-700">
            Deskripsi <span className="font-normal text-zinc-400">(opsional)</span>
          </span>
          <textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            maxLength={1000}
            rows={4}
            disabled={submitting}
            className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-50 disabled:bg-zinc-50"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}
