import { apiFetch } from "./api";

export async function login(email: string, password: string) {
  const data = await apiFetch("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("token", data.accessToken);
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

  localStorage.setItem("token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}