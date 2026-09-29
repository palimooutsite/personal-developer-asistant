'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import { getCurrentUser, type CurrentUser } from '../../lib/auth';
import { changePassword, updateProfile, uploadAvatar } from '../../lib/account';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setName(currentUser.name ?? '');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Profil tidak dapat dimuat.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setError('');
    try {
      const updated = await updateProfile(name);
      setUser(updated);
      setName(updated.name ?? '');
      setProfileMessage('Profil berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Profil gagal diperbarui.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Foto harus JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2 MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      setUser(await uploadAvatar(file));
      setProfileMessage('Foto profil berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Foto profil gagal diunggah.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordError('Konfirmasi password tidak sama.');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setPasswordMessage('Password berhasil diubah.');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Password gagal diubah.');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#f6f7fb] p-6"><div className="mx-auto max-w-4xl"><div className="h-8 w-52 animate-pulse rounded bg-zinc-200" /><div className="mt-6 h-72 animate-pulse rounded-3xl bg-zinc-200" /></div></main>;
  }

  const initials = (user?.name || user?.username || 'U').trim().charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Account Settings</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Pengaturan Akun</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Kelola profil, foto, dan keamanan akun kamu.</p>
          </div>
          <button type="button" onClick={() => router.back()} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Kembali</button>
        </header>

        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="mt-7 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Foto profil" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-white shadow-sm" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-950 text-3xl font-bold text-white ring-4 ring-white shadow-sm">{initials}</div>
                )}
                <label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white text-zinc-700 shadow-md ring-1 ring-zinc-200 hover:bg-zinc-50">
                  <span aria-hidden="true">+</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} className="sr-only" disabled={uploading} />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.name || user?.username}</h2>
                <p className="mt-1 text-sm text-zinc-500">@{user?.username}</p>
                <p className="mt-2 text-xs text-zinc-400">{uploading ? 'Mengunggah foto...' : 'JPG, PNG, WebP · maksimal 2 MB'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Profile</p><h2 className="mt-1 text-xl font-bold">Informasi dasar</h2></div>
            <form onSubmit={handleProfileSubmit} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-zinc-800">Nama</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200" placeholder="Nama kamu" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-800">Username</label>
                <input value={user?.username ?? ''} readOnly className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600 outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-800">Email</label>
                <input value={user?.email ?? ''} readOnly className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600 outline-none" />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="submit" disabled={savingProfile} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">{savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                {profileMessage ? <span className="text-sm font-medium text-emerald-600">{profileMessage}</span> : null}
              </div>
            </form>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Security</p><h2 className="mt-1 text-xl font-bold">Ubah Password</h2><p className="mt-2 text-sm text-zinc-500">Gunakan password minimal 8 karakter dan jangan gunakan password yang sama di layanan lain.</p></div>
          <form onSubmit={handlePasswordSubmit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="currentPassword" className="mb-2 block text-sm font-semibold text-zinc-800">Password saat ini</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200" />
            </div>
            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-zinc-800">Password baru</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200" />
            </div>
            <div>
              <label htmlFor="confirmation" className="mb-2 block text-sm font-semibold text-zinc-800">Konfirmasi password</label>
              <input id="confirmation" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} minLength={8} required autoComplete="new-password" className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200" />
            </div>
            {passwordError ? <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{passwordError}</div> : null}
            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={changingPassword} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">{changingPassword ? 'Mengubah...' : 'Ubah Password'}</button>
              {passwordMessage ? <span className="text-sm font-medium text-emerald-600">{passwordMessage}</span> : null}
            </div>
          </form>
        </section>

        <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Account identity</p>
          <h2 className="mt-1 text-lg font-bold text-amber-950">Email belum dapat diubah</h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">Untuk keamanan akun dan kebutuhan SaaS, email akan diperlakukan sebagai identitas login. Fitur ganti email sebaiknya ditambahkan nanti dengan verifikasi email baru dan konfirmasi password.</p>
        </section>
      </div>
    </main>
  );
}
