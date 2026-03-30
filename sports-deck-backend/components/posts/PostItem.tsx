"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createReply } from "@/lib/posts";
import { apiFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Version = { id: number; version: number; content: string; createdAt: string };

type Reply = {
  id: string;
  content: string;
  version?: number;
  author?: { id?: string; username?: string };
};

type Post = {
  id: string;
  content: string;
  version?: number;
  author?: { id?: string; username?: string };
  replies?: Reply[];
};

/* ------------------------------------------------------------------ */
/*  Small shared helpers                                                */
/* ------------------------------------------------------------------ */

function timeAgo(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  HistoryModal — reused for posts and replies                         */
/* ------------------------------------------------------------------ */

function HistoryModal({
  versions,
  onClose,
}: {
  versions: Version[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">Edit History</h3>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕ Close
          </button>
        </div>
        {versions.length === 0 ? (
          <p className="text-sm text-zinc-500">No earlier versions found.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {versions.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                  <span>Version {v.version}</span>
                  <span>{timeAgo(v.createdAt)}</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {v.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ReportModal                                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  FollowButton — inline follow/unfollow for a user                   */
/* ------------------------------------------------------------------ */

function FollowButton({
  authorId,
  currentUserId,
}: {
  authorId: string | undefined;
  currentUserId: string | null;
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const isLoggedIn = !!currentUserId;

  useEffect(() => {
    if (!authorId || !currentUserId || authorId === currentUserId) return;
    apiFetch(`/api/users/${authorId}`)
      .then((data) => setFollowing(data.isFollowing ?? false))
      .catch(() => {});
  }, [authorId, currentUserId]);

  // Never show for self
  if (!authorId || authorId === currentUserId) return null;

  // Visitor: show a Follow button that redirects to login
  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-blue-300 px-2 py-0.5 text-xs text-blue-500 transition hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/20"
      >
        Follow
      </Link>
    );
  }

  // Logged in but follow-state not yet loaded
  if (following === null) return null;

  async function handleToggle() {
    setLoading(true);
    try {
      if (following) {
        await apiFetch(`/api/users/${authorId}/follow`, { method: "DELETE", auth: true });
        setFollowing(false);
      } else {
        await apiFetch(`/api/users/${authorId}/follow`, { method: "POST", auth: true });
        setFollowing(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full border px-2 py-0.5 text-xs transition disabled:opacity-50 ${
        following
          ? "border-zinc-300 text-zinc-400 hover:border-red-300 hover:text-red-500 dark:border-zinc-700"
          : "border-blue-300 text-blue-500 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-900/20"
      }`}
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ReplyRow                                                            */
/* ------------------------------------------------------------------ */

function ReplyRow({
  reply,
  currentUserId,
  onDelete,
}: {
  reply: Reply;
  currentUserId: string | null;
  onDelete: (id: string) => void;
}) {
  const [content, setContent] = useState(reply.content);
  const [version, setVersion] = useState(reply.version ?? 1);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reply.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<Version[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isOwner = !!currentUserId && currentUserId === reply.author?.id;

  async function handleSave() {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/replies/${reply.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ content: editText }),
      });
      setContent(updated.content);
      setVersion(updated.version);
      setEditing(false);
    } catch {
      alert("Failed to save reply.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this reply?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/replies/${reply.id}`, { method: "DELETE", auth: true });
      onDelete(reply.id);
    } catch {
      alert("Failed to delete reply.");
      setDeleting(false);
    }
  }

  async function handleTranslate() {
    if (translation) { setTranslation(null); return; }
    setTranslating(true);
    try {
      const r = await apiFetch(`/api/replies/${reply.id}/translate`);
      setTranslation(r.translation);
    } catch { /* silent */ } finally {
      setTranslating(false);
    }
  }

  async function handleHistory() {
    if (historyVersions) { setHistoryVersions(null); return; }
    setLoadingHistory(true);
    try {
      const v = await apiFetch(`/api/replies/${reply.id}/history`);
      setHistoryVersions(v);
    } catch { /* silent */ } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div className="text-sm">
      {historyVersions && (
        <HistoryModal versions={historyVersions} onClose={() => setHistoryVersions(null)} />
      )}

      {editing ? (
        <div className="flex gap-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              onClick={() => { setEditing(false); setEditText(content); }}
              className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p>
          {content}
          {version > 1 && (
            <span className="ml-1 text-xs text-zinc-400">(edited)</span>
          )}
        </p>
      )}

      {translation && (
        <p className="mt-1 rounded-lg bg-blue-50 px-2 py-1 text-xs italic text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          🌐 {translation}
        </p>
      )}

      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        {reply.author?.username && (
          reply.author.id ? (
            <Link
              href={`/users/${reply.author.id}`}
              className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
            >
              {reply.author.username}
            </Link>
          ) : (
            <span className="text-xs text-zinc-500">{reply.author.username}</span>
          )
        )}
        <FollowButton authorId={reply.author?.id} currentUserId={currentUserId} />
        <button onClick={handleTranslate} disabled={translating} className="text-xs text-blue-400 hover:underline disabled:opacity-50">
          {translating ? "…" : translation ? "Hide" : "Translate"}
        </button>
        {version > 1 && (
          <button onClick={handleHistory} disabled={loadingHistory} className="text-xs text-zinc-400 hover:underline disabled:opacity-50">
            {loadingHistory ? "…" : "History"}
          </button>
        )}
        {isOwner && !editing && (
          <>
            <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-blue-500 hover:underline">
              Edit
            </button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs text-zinc-400 hover:text-red-500 hover:underline disabled:opacity-50">
              {deleting ? "…" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PostItem                                                            */
/* ------------------------------------------------------------------ */

export function PostItem({
  post,
  currentUserId,
  onDelete,
}: {
  post: Post;
  currentUserId?: string | null;
  onDelete?: (id: string) => void;
}) {
  const [content, setContent] = useState(post.content);
  const [version, setVersion] = useState(post.version ?? 1);
  const [replies, setReplies] = useState<Reply[]>(post.replies ?? []);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");

  const [showReport, setShowReport] = useState(false);

  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const [historyVersions, setHistoryVersions] = useState<Version[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Determine ownership (passed in or read from localStorage)
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(currentUserId ?? null);
  useEffect(() => {
    if (!currentUserId) {
      setResolvedUserId(localStorage.getItem("userId"));
    }
  }, [currentUserId]);

  const isOwner = !!resolvedUserId && resolvedUserId === post.author?.id;

  async function handleSave() {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ content: editText }),
      });
      setContent(updated.content);
      setVersion(updated.version);
      setEditing(false);
    } catch {
      alert("Failed to save post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/posts/${post.id}`, { method: "DELETE", auth: true });
      onDelete?.(post.id);
    } catch {
      alert("Failed to delete post.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    try {
      const newReply = await createReply(replyText, post.id);
      setReplies((prev) => [...prev, newReply]);
      setReplyText("");
      setShowReply(false);
    } catch {
      alert("Failed to reply.");
    }
  }

  async function handleTranslate() {
    if (translation) { setTranslation(null); return; }
    setTranslating(true);
    try {
      const r = await apiFetch(`/api/posts/${post.id}/translate`);
      setTranslation(r.translation);
    } catch { /* silent */ } finally {
      setTranslating(false);
    }
  }

  async function handleHistory() {
    if (historyVersions) { setHistoryVersions(null); return; }
    setLoadingHistory(true);
    try {
      const v = await apiFetch(`/api/posts/${post.id}/history`);
      setHistoryVersions(v);
    } catch { /* silent */ } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <>
      {showReport && (
        <ReportModal postId={post.id} onClose={() => setShowReport(false)} />
      )}
      {historyVersions && (
        <HistoryModal versions={historyVersions} onClose={() => setHistoryVersions(null)} />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="font-semibold">Delete this post?</p>
            <p className="mt-1 text-sm text-zinc-500">This action cannot be undone.</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        {/* Post content / edit box */}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(content); }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {content}
            {version > 1 && (
              <span className="ml-1 text-xs text-zinc-400">(edited)</span>
            )}
          </p>
        )}

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
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-zinc-500">
              by{" "}
              {post.author.id ? (
                <Link
                  href={`/users/${post.author.id}`}
                  className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  {post.author.username}
                </Link>
              ) : (
                post.author.username
              )}
            </p>
            <FollowButton authorId={post.author?.id} currentUserId={resolvedUserId} />
          </div>
        )}

        {/* Actions row */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button onClick={() => setShowReply((p) => !p)} className="text-xs text-blue-500 hover:underline">
            Reply
          </button>
          <button onClick={handleTranslate} disabled={translating} className="text-xs text-blue-400 hover:underline disabled:opacity-50">
            {translating ? "Translating…" : translation ? "Hide translation" : "Translate"}
          </button>
          {version > 1 && (
            <button onClick={handleHistory} disabled={loadingHistory} className="text-xs text-zinc-400 hover:underline disabled:opacity-50">
              {loadingHistory ? "…" : "History"}
            </button>
          )}
          {isOwner && !editing && (
            <>
              <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-blue-500 hover:underline">
                Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-zinc-400 hover:text-red-500 hover:underline">
                Delete
              </button>
            </>
          )}
          <button onClick={() => setShowReport(true)} className="text-xs text-zinc-400 hover:text-red-500 hover:underline">
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
              <ReplyRow
                key={reply.id}
                reply={reply}
                currentUserId={resolvedUserId}
                onDelete={(rid) => setReplies((prev) => prev.filter((r) => r.id !== rid))}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
