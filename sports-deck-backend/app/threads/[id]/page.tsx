"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { getThreadById } from "@/lib/threads";
import { createPost } from "@/lib/posts";
import { PostItem } from "@/components/posts/PostItem";
import { ReplyInput } from "@/components/posts/ReplyInput";
import { apiFetch } from "@/lib/api";

type Thread = {
  id: string;
  title: string;
  content?: string;
  author?: {
    username?: string;
  };
};

function ThreadReportModal({
  threadId,
  onClose,
}: {
  threadId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ threadId: Number(threadId), reason }),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        {done ? (
          <div className="text-center">
            <p className="text-green-600 font-medium">Thread reported.</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="mb-3 text-base font-bold">Report Thread</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this thread is inappropriate..."
                rows={3}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                required
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Report"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));

    async function fetchThread() {
      try {
        const data = await getThreadById(id);

        console.log("THREAD DATA:", data);

        // adjust if your backend wraps data differently
        setThread(data);
        setPosts(data.posts || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchThread();
  }, [id]);

  async function handleCreatePost(content: string) {
    try {
      const newPost = await createPost(content, id);

      // optimistic update
      setPosts((prev) => [newPost, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to create post");
    }
  }

  if (loading) return <p>Loading thread...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!thread) return <p>Thread not found.</p>;

  return (
    <>
      {showReport && (
        <ThreadReportModal threadId={id} onClose={() => setShowReport(false)} />
      )}

      <div className="space-y-6">
        {/* Thread Header */}
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{thread.title}</h1>

              {thread.author?.username && (
                <p className="mt-1 text-sm text-zinc-500">
                  by {thread.author.username}
                </p>
              )}

              {thread.content && (
                <p className="mt-4 text-zinc-700 dark:text-zinc-300">
                  {thread.content}
                </p>
              )}
            </div>

            {isLoggedIn && (
              <button
                onClick={() => setShowReport(true)}
                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-300 hover:text-red-500 dark:border-zinc-700"
              >
                Report
              </button>
            )}
          </div>
        </div>

        {/* Discussion Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Discussion</h2>

          {/* Create Post */}
          <h3 className="text-sm text-zinc-500">Create a post</h3>
          <ReplyInput onSubmit={handleCreatePost} />

          {/* Posts */}
          {posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostItem key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
