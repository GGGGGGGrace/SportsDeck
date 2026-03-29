"use client";

import { useState } from "react";
import { createReply } from "@/lib/posts";
import { apiFetch } from "@/lib/api";

type Reply = {
  id: string;
  content: string;
  author?: {
    username?: string;
  };
};

type Post = {
  id: string;
  content: string;
  author?: {
    username?: string;
  };
  replies?: Reply[];
};

function ReportModal({
  postId,
  onClose,
}: {
  postId: string;
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
        body: JSON.stringify({ postId: Number(postId), reason }),
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
            <p className="text-green-600 font-medium">Report submitted.</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="mb-3 text-base font-bold">Report Post</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this post is inappropriate..."
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

/* ---------- inline reply row with its own translate toggle ---------- */
function ReplyRow({ reply }: { reply: Reply }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  async function handleTranslate() {
    if (translation) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    try {
      const result = await apiFetch(`/api/replies/${reply.id}/translate`);
      setTranslation(result.translation);
    } catch {
      // silent fail
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="text-sm">
      <p>{reply.content}</p>
      {translation && (
        <p className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-xs italic text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          🌐 {translation}
        </p>
      )}
      <div className="mt-0.5 flex items-center gap-2">
        {reply.author?.username && (
          <p className="text-xs text-zinc-500">{reply.author.username}</p>
        )}
        <button
          onClick={handleTranslate}
          disabled={translating}
          className="text-xs text-blue-400 hover:underline disabled:opacity-50"
        >
          {translating ? "Translating…" : translation ? "Hide translation" : "Translate"}
        </button>
      </div>
    </div>
  );
}

/* ---------- main PostItem ---------- */
export function PostItem({ post }: { post: Post }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(post.replies || []);
  const [showReport, setShowReport] = useState(false);

  // Translation state for the post itself
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  async function handleReply() {
    if (!replyText.trim()) return;

    try {
      const newReply = await createReply(replyText, post.id);
      setReplies((prev) => [...prev, newReply]);
      setReplyText("");
      setShowReply(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reply");
    }
  }

  async function handleTranslate() {
    if (translation) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    try {
      const result = await apiFetch(`/api/posts/${post.id}/translate`);
      setTranslation(result.translation);
    } catch {
      // silent fail — translation service may be unavailable
    } finally {
      setTranslating(false);
    }
  }

  return (
    <>
      {showReport && (
        <ReportModal postId={post.id} onClose={() => setShowReport(false)} />
      )}

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        {/* Post content */}
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {post.content}
        </p>

        {/* Translation panel */}
        {translation && (
          <div className="mt-2 rounded-xl bg-blue-50 px-3 py-2 dark:bg-blue-900/20">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              🌐 Translation (English)
            </p>
            <p className="mt-0.5 text-sm italic text-blue-700 dark:text-blue-300">
              {translation}
            </p>
          </div>
        )}

        {post.author?.username && (
          <p className="mt-2 text-xs text-zinc-500">by {post.author.username}</p>
        )}

        {/* Actions row */}
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => setShowReply((prev) => !prev)}
            className="text-xs text-blue-500 hover:underline"
          >
            Reply
          </button>
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="text-xs text-blue-400 hover:underline disabled:opacity-50"
          >
            {translating
              ? "Translating…"
              : translation
              ? "Hide translation"
              : "Translate"}
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-zinc-400 hover:text-red-500 hover:underline"
          >
            Report
          </button>
        </div>

        {/* Reply input */}
        {showReply && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              onClick={handleReply}
              className="rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Send
            </button>
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-4 space-y-2 border-l pl-4">
            {replies.map((reply) => (
              <ReplyRow key={reply.id} reply={reply} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
