import { apiFetch } from "./api";

export async function getThreads() {
  return apiFetch("/api/threads");
}

export async function getThreadById(id: string) {
  return apiFetch(`/api/threads/${id}`);
}

export async function createThread(data: {
  title: string;
  content: string;
  tags?: string[];
}) {
  return apiFetch("/api/threads", {
    method: "POST",
    body: JSON.stringify(data),
    auth: true,
  });
}