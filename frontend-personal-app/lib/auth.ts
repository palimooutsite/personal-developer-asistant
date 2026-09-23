import { apiRequest } from './api';

const TOKEN_KEY = 'pda_access_token';

export interface LoginResponse {
  accessToken: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  window.localStorage.setItem(TOKEN_KEY, response.accessToken);

  return response;
}

export function logout(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/auth/me');
}

export function isAuthenticated(): boolean {
  return Boolean(window.localStorage.getItem(TOKEN_KEY));
}
