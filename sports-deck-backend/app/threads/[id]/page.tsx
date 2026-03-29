"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { getThreadById } from "@/lib/threads";
import { createPost } from "@/lib/posts";
import { PostItem } from "@/components/posts/PostItem";
import { ReplyInput } from "@/components/posts/ReplyInput";
import { apiFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Match = {
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
};

type Thread = {
  id: string;
  title: string;
  content?: string;
  author?: { username?: string };
  match?: Match | null;
};

type TeamSentiment = { name: string; label: string | null; score: number | null };

type SentimentResult = {
  overall: { label: string | null; score: number | null };
  homeTeam: TeamSentiment | null;
  awayTeam: TeamSentiment | null;
  cached: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
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

function SentimentBadge({
  label,
  score,
  name,
}: {
  label: string | null;
  score: number | null;
  name?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl px-4 py-3 ${sentimentBg(label)}`}
    >
      <span className="text-2xl">{sentimentEmoji(label)}</span>
      {name && (
        <span className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {name}
        </span>
      )}
      <span className={`mt-0.5 text-sm font-bold capitalize ${sentimentText(label)}`}>
        {label ?? "N/A"}
      </span>
      {score !== null && (
        <span className="text-xs text-zinc-400">
          {Math.round(score * 100)}% confidence
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Report modal (unchanged)                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

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

  // Sentiment state
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [sentimentError, setSentimentError] = useState("");
  const [sentimentLoaded, setSentimentLoaded] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));

    async function fetchThread() {
      try {
        const data = await getThreadById(id);
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

  async function handleLoadSentiment() {
    if (sentimentLoaded) {
      // toggle off
      setSentiment(null);
      setSentimentLoaded(false);
      return;
    }
    setSentimentLoading(true);
    setSentimentError("");
    try {
      const data = await apiFetch(`/api/threads/${id}/sentiment`);
      setSentiment(data);
      setSentimentLoaded(true);
    } catch (err: any) {
      setSentimentError("Could not load sentiment analysis.");
    } finally {
      setSentimentLoading(false);
    }
  }

  async function handleCreatePost(content: string) {
    try {
      const newPost = await createPost(content, id);
      setPosts((prev) => [newPost, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to create post");
    }
  }

  if (loading) return <p>Loading thread...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!thread) return <p>Thread not found.</p>;

  const isMatchThread = !!thread.match;

  return (
    <>
      {showReport && (
        <ThreadReportModal threadId={id} onClose={() => setShowReport(false)} />
      )}

      <div className="space-y-6">
        {/* ---- Thread Header ---- */}
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

        {/* ---- Sentiment Section ---- */}
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                🧠 Community Sentiment
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isMatchThread
                  ? "Overall mood + per-team fan sentiment, powered by AI."
                  : "Overall mood of this discussion, powered by AI."}
              </p>
            </div>
            <button
              onClick={handleLoadSentiment}
              disabled={sentimentLoading}
              className="shrink-0 rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {sentimentLoading
                ? "Analyzing…"
                : sentimentLoaded
                ? "Hide"
                : "Analyze"}
            </button>
          </div>

          {sentimentError && (
            <p className="mt-3 text-xs text-red-500">{sentimentError}</p>
          )}

          {/* Sentiment loading skeleton */}
          {sentimentLoading && (
            <div className="mt-4 flex gap-3">
              {[...Array(isMatchThread ? 3 : 1)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 flex-1 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
                />
              ))}
            </div>
          )}

          {/* Sentiment results */}
          {sentiment && !sentimentLoading && (
            <div className="mt-4 space-y-3">
              {/* Overall */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Overall Thread Mood
                </p>
                <SentimentBadge
                  label={sentiment.overall.label}
                  score={sentiment.overall.score}
                />
              </div>

              {/* Per-team (match threads only) */}
              {isMatchThread &&
                (sentiment.homeTeam || sentiment.awayTeam) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Fan Sentiment by Team
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {sentiment.homeTeam && (
                        <SentimentBadge
                          label={sentiment.homeTeam.label}
                          score={sentiment.homeTeam.score}
                          name={sentiment.homeTeam.name}
                        />
                      )}
                      {sentiment.awayTeam && (
                        <SentimentBadge
                          label={sentiment.awayTeam.label}
                          score={sentiment.awayTeam.score}
                          name={sentiment.awayTeam.name}
                        />
                      )}
                    </div>
                  </div>
                )}

              {sentiment.cached && (
                <p className="text-right text-xs text-zinc-400">
                  ✓ Cached result
                </p>
              )}
            </div>
          )}
        </div>

        {/* ---- Discussion Section ---- */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Discussion</h2>

          <h3 className="text-sm text-zinc-500">Create a post</h3>
          <ReplyInput onSubmit={handleCreatePost} />

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
