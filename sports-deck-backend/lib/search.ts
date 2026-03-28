import { apiFetch } from "./api";

export async function searchThreads(query: string) {
  return apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
}