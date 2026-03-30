"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getThreadById } from "@/lib/threads";
import { createPost } from "@/lib/posts";
import { PostItem } from "@/components/posts/PostItem";
import { ReplyInput } from "@/components/posts/ReplyInput";
import { apiFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Match = { homeTeam: string; awayTeam: string };

type PollOption = {
  id: number;
  text: string;
  votes: { id: number; userId: string }[];
};

type Poll = {
  id: number;
  question: string;
  deadline: string;
  threadId: number;
  options: PollOption[];
};

type Thread = {
  id: string;
  title: string;
  content?: string;
  authorId?: string;
  author?: { id?: string; username?: string };
  match?: Match | null;
  polls?: Poll[];
};

type SentimentResult = {
  overall: { label: string | null; score: number | null };
  homeTeam: { name: string; label: string | null; score: number | null } | null;
  awayTeam: { name: string; label: string | null; score: number | null } | null;
  cached: boolean;
};

/* ------------------------------------------------------------------ */
/*  Sentiment helpers                                                   */
/* ------------------------------------------------------------------ */

function sentimentBg(label: string | null) {
  if (!label) return "bg-zinc-100 dark:bg-zinc-800";
  const l = label.toLowerCase();
  if (l.includes("positive")) return "bg-green-50 dark:bg-green-900/20";
  if (l.includes("negative")) return "bg-red-50 dark:bg-red-900/20";
  return "bg-blue-50 dark:bg-blue-900/20";
}
function sentimentText(label: string | null) {
  if (!label) return "text-zinc-500";
  const l = label.toLowerCase();
  if (l.includes("positive")) return "text-green-700 dark:text-green-400";
  if (l.includes("negative")) return "text-red-700 dark:text-red-400";
  return "text-blue-700 dark:text-blue-400";
}
function sentimentEmoji(label: string | null) {
  if (!label) return "💬";
  const l = label.toLowerCase();
  if (l.includes("positive")) return "😊";
  if (l.includes("negative")) return "😤";
  return "😐";
}

function SentimentBadge({ label, score, name }: { label: string | null; score: number | null; name?: string }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl px-4 py-3 ${sentimentBg(label)}`}>
      <span className="text-2xl">{sentimentEmoji(label)}</span>
      {name && <span className="mt-1 text-xs font-semibold text-zinc-500">{name}</span>}
      <span className={`mt-0.5 text-sm font-bold capitalize ${sentimentText(label)}`}>{label ?? "N/A"}</span>
      {score !== null && <span className="text-xs text-zinc-400">{Math.round(score * 100)}% confidence</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PollCard                                                            */
/* ------------------------------------------------------------------ */

function PollCard({
  poll,
  currentUserId,
  threadAuthorId,
  onDelete,
}: {
  poll: Poll;
  currentUserId: string | null;
  threadAuthorId: string | null;
  onDelete: (id: number) => void;
}) {
  const isExpired = new Date() > new Date(poll.deadline);
  const allVotes = poll.options.flatMap((o) => o.votes);
  const totalVotes = allVotes.length;
  const myVote = currentUserId ? allVotes.find((v) => v.userId === currentUserId) : null;
  const myOptionId = myVote
    ? poll.options.find((o) => o.votes.some((v) => v.id === myVote.id))?.id
    : null;

  const [voted, setVoted] = useState<number | null>(myOptionId ?? null);
  const [voteCounts, setVoteCounts] = useState<Record<number, number>>(
    Object.fromEntries(poll.options.map((o) => [o.id, o.votes.length]))
  );
  const [voting, setVoting] = useState(false);

  // Edit poll state
  const isOwner = !!currentUserId && currentUserId === threadAuthorId;
  const [editing, setEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(poll.question);
  const [editDeadline, setEditDeadline] = useState(
    new Date(poll.deadline).toISOString().slice(0, 16)
  );
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState(poll.question);
  const [deadline, setDeadline] = useState(poll.deadline);

  async function handleVote(optionId: number) {
    if (voted || isExpired || !currentUserId) return;
    setVoting(true);
    try {
      await apiFetch("/api/polls/vote", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ optionId }),
      });
      setVoted(optionId);
      setVoteCounts((prev) => ({ ...prev, [optionId]: (prev[optionId] ?? 0) + 1 }));
    } catch (err: any) {
      alert(err.message || "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/polls/${poll.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ question: editQuestion, deadline: new Date(editDeadline).toISOString() }),
      });
      setQuestion(updated.question);
      setDeadline(updated.deadline);
      setEditing(false);
    } catch (err: any) {
      alert(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this poll?")) return;
    try {
      await apiFetch(`/api/polls/${poll.id}`, { method: "DELETE", auth: true });
      onDelete(poll.id);
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  }

  const currentTotal = Object.values(voteCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <input
            value={editQuestion}
            onChange={(e) => setEditQuestion(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        ) : (
          <p className="font-semibold">{question}</p>
        )}
        {isOwner && !editing && (
          <div className="flex shrink-0 gap-2 text-xs">
            <button onClick={() => setEditing(true)} className="text-zinc-400 hover:text-blue-500 hover:underline">
              Edit
            </button>
            <button onClick={handleDelete} className="text-zinc-400 hover:text-red-500 hover:underline">
              Delete
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-zinc-500">New deadline</label>
          <input
            type="datetime-local"
            value={editDeadline}
            onChange={(e) => setEditDeadline(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={saving}
              className="rounded-lg bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="mt-3 space-y-2">
        {poll.options.map((option) => {
          const count = voteCounts[option.id] ?? 0;
          const pct = currentTotal > 0 ? Math.round((count / currentTotal) * 100) : 0;
          const isMyVote = voted === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!voted || isExpired || !currentUserId || voting}
              className={`relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition
                ${isMyVote
                  ? "border-blue-500 bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"}
                disabled:cursor-default`}
            >
              {(voted || isExpired) && (
                <span
                  className="absolute inset-y-0 left-0 bg-blue-100/60 dark:bg-blue-900/30 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span>{option.text}</span>
                {(voted || isExpired) && (
                  <span className="text-xs text-zinc-500">{pct}% ({count})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        {currentTotal} vote{currentTotal !== 1 ? "s" : ""} ·{" "}
        {isExpired
          ? "Poll closed"
          : `Closes ${new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CreatePollModal                                                     */
/* ------------------------------------------------------------------ */

function CreatePollModal({
  threadId,
  onCreated,
  onClose,
}: {
  threadId: string;
  onCreated: (poll: Poll) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, j) => (j === i ? val : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("At least 2 options required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const poll = await apiFetch("/api/polls", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          threadId: Number(threadId),
          question: question.trim(),
          options: cleanOptions,
          deadline: new Date(deadline).toISOString(),
        }),
      });
      // Reload poll with options
      const full = await apiFetch(`/api/polls/${poll.id}`);
      onCreated(full);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create poll");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-4 text-base font-bold">Create Poll</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question…"
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          ))}
          <button
            type="button"
            onClick={() => setOptions((p) => [...p, ""])}
            className="text-xs text-blue-500 hover:underline"
          >
            + Add option
          </button>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create Poll"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Thread Report Modal                                                 */
/* ------------------------------------------------------------------ */

function ThreadReportModal({ threadId, onClose }: { threadId: string; onClose: () => void }) {
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
            <button onClick={onClose} className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
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
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {loading ? "Submitting..." : "Submit Report"}
                </button>
                <button type="button" onClick={onClose}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
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
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();

  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  // Thread edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Sentiment
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentLoaded, setSentimentLoaded] = useState(false);
  const [sentimentError, setSentimentError] = useState("");

  useEffect(() => {
    const uid = localStorage.getItem("userId");
    const token = localStorage.getItem("token");
    setCurrentUserId(uid);
    setIsLoggedIn(Boolean(token));

    async function fetchThread() {
      try {
        const data = await getThreadById(id);
        setThread(data);
        setPosts(data.posts || []);
        setPolls(data.polls || []);
        setEditTitle(data.title ?? "");
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
      setPosts((prev) => [newPost, ...prev]);
    } catch {
      alert("Failed to create post");
    }
  }

  async function handleSaveTitle() {
    if (!editTitle.trim()) return;
    setSavingTitle(true);
    try {
      const updated = await apiFetch(`/api/threads/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ title: editTitle }),
      });
      setThread((t) => t ? { ...t, title: updated.title } : t);
      setEditingTitle(false);
    } catch {
      alert("Failed to update thread title.");
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleDeleteThread() {
    if (!confirm("Delete this entire thread? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/threads/${id}`, { method: "DELETE", auth: true });
      router.push("/threads");
    } catch {
      alert("Failed to delete thread.");
    }
  }

  async function handleLoadSentiment() {
    if (sentimentLoaded) { setSentiment(null); setSentimentLoaded(false); return; }
    setSentimentLoading(true);
    setSentimentError("");
    try {
      const data = await apiFetch(`/api/threads/${id}/sentiment`);
      setSentiment(data);
      setSentimentLoaded(true);
    } catch {
      setSentimentError("Could not load sentiment analysis.");
    } finally {
      setSentimentLoading(false);
    }
  }

  if (loading) return <p>Loading thread...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!thread) return <p>Thread not found.</p>;

  const isThreadOwner =
    !!currentUserId &&
    (currentUserId === thread.authorId || currentUserId === thread.author?.id);
  const isMatchThread = !!thread.match;

  return (
    <>
      {showReport && <ThreadReportModal threadId={id} onClose={() => setShowReport(false)} />}
      {showCreatePoll && (
        <CreatePollModal
          threadId={id}
          onCreated={(poll) => setPolls((prev) => [...prev, poll])}
          onClose={() => setShowCreatePoll(false)}
        />
      )}

      <div className="space-y-6">
        {/* ---- Thread Header ---- */}
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editingTitle ? (
                <div className="flex gap-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-lg font-bold dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <button onClick={handleSaveTitle} disabled={savingTitle}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-50">
                    {savingTitle ? "…" : "Save"}
                  </button>
                  <button onClick={() => { setEditingTitle(false); setEditTitle(thread.title ?? ""); }}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
                    Cancel
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl font-bold">{thread.title}</h1>
              )}
              {thread.author?.username && (
                <p className="mt-1 text-sm text-zinc-500">
                  by{" "}
                  {thread.author.id ? (
                    <Link
                      href={`/users/${thread.author.id}`}
                      className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      {thread.author.username}
                    </Link>
                  ) : (
                    thread.author.username
                  )}
                </p>
              )}
              {thread.content && (
                <p className="mt-4 text-zinc-700 dark:text-zinc-300">{thread.content}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 items-end">
              {isThreadOwner && !editingTitle && (
                <>
                  <button onClick={() => setEditingTitle(true)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-400 hover:text-blue-500 dark:border-zinc-700">
                    Edit
                  </button>
                  <button onClick={handleDeleteThread}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-300 hover:text-red-500 dark:border-zinc-700">
                    Delete
                  </button>
                </>
              )}
              {isLoggedIn && (
                <button onClick={() => setShowReport(true)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-300 hover:text-red-500 dark:border-zinc-700">
                  Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Sentiment ---- */}
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">🧠 Community Sentiment</h2>
              <p className="text-xs text-zinc-500">
                {isMatchThread ? "Overall mood + per-team fan sentiment, powered by AI." : "Overall mood, powered by AI."}
              </p>
            </div>
            <button onClick={handleLoadSentiment} disabled={sentimentLoading}
              className="shrink-0 rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
              {sentimentLoading ? "Analyzing…" : sentimentLoaded ? "Hide" : "Analyze"}
            </button>
          </div>
          {sentimentError && <p className="mt-3 text-xs text-red-500">{sentimentError}</p>}
          {sentimentLoading && (
            <div className="mt-4 flex gap-3">
              {[...Array(isMatchThread ? 3 : 1)].map((_, i) => (
                <div key={i} className="h-20 flex-1 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
              ))}
            </div>
          )}
          {sentiment && !sentimentLoading && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Overall Thread Mood</p>
                <SentimentBadge label={sentiment.overall.label} score={sentiment.overall.score} />
              </div>
              {isMatchThread && (sentiment.homeTeam || sentiment.awayTeam) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Fan Sentiment by Team</p>
                  <div className="grid grid-cols-2 gap-3">
                    {sentiment.homeTeam && <SentimentBadge label={sentiment.homeTeam.label} score={sentiment.homeTeam.score} name={sentiment.homeTeam.name} />}
                    {sentiment.awayTeam && <SentimentBadge label={sentiment.awayTeam.label} score={sentiment.awayTeam.score} name={sentiment.awayTeam.name} />}
                  </div>
                </div>
              )}
              {sentiment.cached && <p className="text-right text-xs text-zinc-400">✓ Cached result</p>}
            </div>
          )}
        </div>

        {/* ---- Polls ---- */}
        {(polls.length > 0 || isLoggedIn) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Polls</h2>
              {isLoggedIn && (
                <button onClick={() => setShowCreatePoll(true)}
                  className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  + Add Poll
                </button>
              )}
            </div>
            {polls.length === 0 ? (
              <p className="text-sm text-zinc-500">No polls yet. Be the first to ask!</p>
            ) : (
              polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  currentUserId={currentUserId}
                  threadAuthorId={thread.authorId ?? thread.author?.id ?? null}
                  onDelete={(pid) => setPolls((prev) => prev.filter((p) => p.id !== pid))}
                />
              ))
            )}
          </div>
        )}

        {/* ---- Discussion ---- */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Discussion</h2>
          <h3 className="text-sm text-zinc-500">Create a post</h3>
          <ReplyInput onSubmit={handleCreatePost} />
          {posts.length === 0 ? (
            <p className="text-sm text-zinc-500">No posts yet.</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  currentUserId={currentUserId}
                  onDelete={(pid) => setPosts((prev) => prev.filter((p) => String(p.id) !== String(pid)))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
