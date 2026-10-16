import { apiFetch } from "./api";

type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: { id?: string; role?: string };
};

export function saveSession(data: AuthResponse) {
  localStorage.setItem("token", data.accessToken);
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
  if (data.user?.role) localStorage.setItem("role", data.user.role);
  if (data.user?.id) localStorage.setItem("userId", data.user.id);
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
}

export async function login(email: string, password: string) {
  const data = await apiFetch("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  saveSession(data);
  return data;
}

export async function register(
  email: string,
  password: string,
  username: string
) {
  const data = await apiFetch("/api/users/register", {
    method: "POST",
    body: JSON.stringify({ email, password, username }),
  });

  saveSession(data);
  return data;
}

export function logout() {
  clearSession();
}
