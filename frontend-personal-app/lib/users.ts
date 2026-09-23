import { apiRequest } from './api';

export interface UserPickerItem {
  id: string;
  username: string;
  email: string;
  name: string | null;
}

export async function searchUsers(search = ''): Promise<UserPickerItem[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<UserPickerItem[]>(`/users/search${query}`);
}
