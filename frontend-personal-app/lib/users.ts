import { apiRequest } from './api';

export interface UserPickerItem {
  id: string;
  username: string;
  email: string;
  name: string | null;
}

export interface UserSearchResponse {
  data: UserPickerItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function searchUsers(
  search = '',
  page = 1,
  limit = 5,
  excludeUserIds: string[] = [],
): Promise<UserSearchResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(Math.min(10, limit)),
  });

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (excludeUserIds.length > 0) {
    params.set('excludeUserIds', excludeUserIds.join(','));
  }

  return apiRequest<UserSearchResponse>(`/users/search?${params.toString()}`);
}
