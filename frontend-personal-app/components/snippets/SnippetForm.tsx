'use client';

import { FormEvent, useEffect, useState } from 'react';
import { StyledSelect } from '../ui/StyledSelect';

export interface SnippetFormValue {
  title: string;
  language: string;
  code: string;
  description: string;
}

interface SnippetFormProps {
  initialValue?: Partial<SnippetFormValue>;
  onSubmit: (value: SnippetFormValue) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const LANGUAGES = [
  ['typescript', 'TypeScript'], ['javascript', 'JavaScript'], ['tsx', 'TSX / React'],
  ['python', 'Python'], ['sql', 'SQL'], ['php', 'PHP'], ['java', 'Java'],
  ['csharp', 'C#'], ['go', 'Go'], ['rust', 'Rust'], ['bash', 'Bash / Shell'],
  ['json', 'JSON'], ['html', 'HTML'], ['css', 'CSS'], ['other', 'Other'],
];

export function SnippetForm({
  initialValue,
  onSubmit,
  onCancel,
  submitting = false,
}: SnippetFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [language, setLanguage] = useState(initialValue?.language ?? 'typescript');
  const [code, setCode] = useState(initialValue?.code ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(initialValue?.title ?? '');
    setLanguage(initialValue?.language ?? 'typescript');
    setCode(initialValue?.code ?? '');
    setDescription(initialValue?.description ?? '');
  }, [initialValue]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !language.trim() || !code.trim()) {
      setError('Judul, bahasa, dan kode wajib diisi.');
      return;
    }
    if (title.length > 200 || language.length > 100 || description.length > 1000) {
      setError('Panjang input melebihi batas yang ditentukan.');
      return;
    }

    setError('');
    try {
      await onSubmit({ title: title.trim(), language: language.trim(), code, description: description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code snippet gagal disimpan.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-zinc-900">{initialValue ? 'Edit Code Snippet' : 'Code Snippet Baru'}</h2>
        <p className="mt-1 text-sm text-zinc-500">Simpan potongan kode agar mudah ditemukan dan digunakan kembali.</p>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-700">Judul</span>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Contoh: NestJS JWT Guard"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-zinc-700">Bahasa</span>
          <StyledSelect
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map(([value, label]) => ({ value, label }))}
            ariaLabel="Pilih bahasa code snippet"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-zinc-700">Deskripsi <span className="font-normal text-zinc-400">(opsional)</span></span>
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={3}
          placeholder="Jelaskan kegunaan atau catatan penting snippet ini..."
          className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50" />
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold text-zinc-700">Kode</span>
        <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} rows={16}
          placeholder="// Tulis code snippet di sini..."
          className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 font-mono text-[13px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/30" />
      </label>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={submitting}
          className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50">Batal</button>
        <button type="submit" disabled={submitting}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Menyimpan...' : initialValue ? 'Simpan Perubahan' : 'Simpan Snippet'}
        </button>
      </div>
    </form>
  );
}
