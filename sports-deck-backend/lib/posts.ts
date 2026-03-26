import { apiFetch } from "./api";

export async function createPost(content: string, threadId: string) {
  return apiFetch("/api/posts", {
    method: "POST",
    body: JSON.stringify({ content, threadId }),
    auth: true,
  });
}

export async function createReply(content: string, postId: string) {
  return apiFetch("/api/replies", {
    method: "POST",
    body: JSON.stringify({ content, postId }),
    auth: true,
  });
}