import { apiRequest } from './api';
import type { CurrentUser } from './auth';

export async function updateProfile(name: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/profile', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function uploadAvatar(file: File): Promise<CurrentUser> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<CurrentUser>('/auth/avatar', {
    method: 'POST',
    body: formData,
  });
}
