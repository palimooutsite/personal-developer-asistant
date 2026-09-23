import { FormEvent } from 'react';
import { ProjectStatus } from '../../lib/projects';
import { StyledSelect } from '../ui/StyledSelect';

interface ProjectFormProps {
  editingId: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  saving: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['PLANNED','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED'];

export function ProjectForm({
  editingId, name, description, status, saving,
  onNameChange, onDescriptionChange, onStatusChange, onSubmit, onClose,
}: ProjectFormProps) {
  return (
    <section id="project-form" className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{editingId ? 'Project' : 'New Project'}</p>
            <h2 className="mt-1 text-xl font-bold">{editingId ? 'Edit Project' : 'Buat Project Baru'}</h2>
            <p className="mt-1 text-sm text-zinc-500">{editingId ? 'Perbarui informasi dan status project.' : 'Isi informasi dasar project untuk mulai bekerja.'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-xl leading-none text-zinc-400 transition hover:bg-white hover:text-zinc-700" aria-label="Tutup form">×</button>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid gap-5 p-6">
        <div>
          <label htmlFor="project-name" className="mb-2 block text-sm font-semibold">Nama Project <span className="text-red-500">*</span></label>
          <input id="project-name" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={200} required autoFocus className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100" placeholder="Contoh: Personal Developer Assistant" />
        </div>
        <div>
          <label htmlFor="project-description" className="mb-2 block text-sm font-semibold">Deskripsi <span className="font-normal text-zinc-400">(opsional)</span></label>
          <textarea id="project-description" value={description} onChange={(event) => onDescriptionChange(event.target.value)} maxLength={2000} rows={4} className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-100" placeholder="Jelaskan secara singkat tujuan atau ruang lingkup project..." />
        </div>
        {editingId ? (
          <div>
            <label htmlFor="project-status" className="mb-2 block text-sm font-semibold">Status Project</label>
            <StyledSelect id="project-status" value={status} onChange={(value) => onStatusChange(value as ProjectStatus)} className="sm:max-w-sm" options={STATUS_OPTIONS.map((option) => ({ value: option, label: option.replace('_', ' ') }))} />
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Project'}
          </button>
        </div>
      </form>
    </section>
  );
}
