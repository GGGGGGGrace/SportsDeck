import { apiFetch } from "./api";

export async function login(email: string, password: string) {
  const data = await apiFetch("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("token", data.accessToken);
  if (data.user?.role) localStorage.setItem("role", data.user.role);
  if (data.user?.id)   localStorage.setItem("userId", data.user.id);
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

  localStorage.setItem("token", data.accessToken);
  if (data.user?.role) localStorage.setItem("role", data.user.role);
  if (data.user?.id)   localStorage.setItem("userId", data.user.id);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
}