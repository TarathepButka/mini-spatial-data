import { appConfig } from "../config/runtime";

export type AuthUser = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
  role?: string;
};

export type AuthResponse = {
  expiresAt: string;
  user: AuthUser;
};

const API_BASE_URL = appConfig.apiBaseUrl;
const API_PREFIX = "/api/v1";
const LEGACY_TOKEN_KEY = "mini-spatial-data.authToken";
const LEGACY_USER_KEY = "mini-spatial-data.authUser";

export function clearLegacyAuthStorage() {
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
}

export async function loginWithGoogleCredential(credential: string): Promise<AuthResponse> {
  return request<AuthResponse>(`${API_PREFIX}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
}

export async function getCurrentUser(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>(`${API_PREFIX}/auth/me`);
}

export async function logoutCurrentUser(): Promise<{ loggedOut: boolean }> {
  return request<{ loggedOut: boolean }>(`${API_PREFIX}/auth/logout`, { method: "POST" });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
