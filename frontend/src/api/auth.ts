import { API_PREFIX, request } from "./client";

export type AuthUser = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
  role?: string;
  roles?: string[];
  permissions?: Permission[];
};

export type Permission = "read" | "create" | "edit" | "delete" | "seed";

export type AuthResponse = {
  expiresAt: string;
  user: AuthUser;
};

const LEGACY_TOKEN_KEY = "mini-spatial-data.authToken";
const LEGACY_USER_KEY = "mini-spatial-data.authUser";

export function clearLegacyAuthStorage() {
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
}

export async function loginWithGoogleCredential(
  credential: string,
): Promise<AuthResponse> {
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
  return request<{ loggedOut: boolean }>(`${API_PREFIX}/auth/logout`, {
    method: "POST",
  });
}

export async function switchCurrentRole(role: string): Promise<AuthResponse> {
  return request<AuthResponse>(`${API_PREFIX}/auth/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export function hasPermission(user: AuthUser | null, permission: Permission) {
  if (!user) {
    return false;
  }

  if (user.permissions?.includes(permission)) {
    return true;
  }

  if (normalizeRole(user.role) === "admin") {
    return true;
  }

  return normalizeRole(user.role) === "user" && ["read", "create", "edit"].includes(permission);
}

function normalizeRole(role?: string) {
  return role?.trim().toLowerCase() || "";
}
