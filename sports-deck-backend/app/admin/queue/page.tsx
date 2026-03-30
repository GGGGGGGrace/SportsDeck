"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Author = {
  id: string;
  username?: string;
  email?: string;
};

type Post = {
  id: number;
  content: string;
  aiModerationLabel?: string;
  aiModerationScore?: number;
  aiModerationReason?: string;
  author?: Author;
};

type Thread = {
  id: number;
  title: string;
  author?: Author;
};

type Report = {
  id: number;
  reason: string;
  status: string;
  createdAt: string;
  postId?: number;
  threadId?: number;
  aiLabel?: string;
  aiScore?: number;
  aiReason?: string;
  post?: Post;
  thread?: Thread;
};

type GroupedItem = {
  key: string;
  type: "post" | "thread";
  contentId: number;
  content: string;
  author?: Author;
  reports: Report[];
  reportCount: number;
  aiLabel?: string;
  aiScore?: number;
  aiReason?: string;
  representativeId: number;
};

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return <span className="text-xs text-zinc-400">N/A</span>;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.7
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : score >= 0.4
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  );
}

export default function AdminQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<GroupedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banLoading, setBanLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }

    async function fetchReports() {
      try {
        const reports: Report[] = await apiFetch("/api/admin/reports", {
          auth: true,
        });

        // Group by postId or threadId
        const map = new Map<string, GroupedItem>();

        for (const r of reports) {
          const key = r.postId != null ? `post-${r.postId}` : `thread-${r.threadId}`;
          if (!map.has(key)) {
            const isPost = r.postId != null;
            map.set(key, {
              key,
              type: isPost ? "post" : "thread",
              contentId: isPost ? r.postId! : r.threadId!,
              content: isPost
                ? r.post?.content ?? "(no content)"
                : r.thread?.title ?? "(no title)",
              author: isPost ? r.post?.author : r.thread?.author,
              reports: [],
              reportCount: 0,
              aiLabel: isPost ? r.post?.aiModerationLabel : undefined,
              aiScore: isPost ? r.post?.aiModerationScore ?? r.aiScore : r.aiScore,
              aiReason: isPost ? r.post?.aiModerationReason : undefined,
              representativeId: r.id,
            });
          }
          const item = map.get(key)!;
          item.reports.push(r);
          item.reportCount++;
        }

        // Sort: aiScore desc, then reportCount desc
        const sorted = Array.from(map.values()).sort((a, b) => {
          const sa = a.aiScore ?? 0;
          const sb = b.aiScore ?? 0;
          if (sb !== sa) return sb - sa;
          return b.reportCount - a.reportCount;
        });

        setItems(sorted);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [router]);

  async function handleAction(item: GroupedItem, status: "APPROVED" | "REJECTED") {
    setActionLoading(item.key);
    setSuccessMsg("");
    try {
      await apiFetch(`/api/admin/reports/${item.representativeId}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.filter((i) => i.key !== item.key));
      setSuccessMsg(
        status === "APPROVED"
          ? "Content hidden and report approved."
          : "Report dismissed."
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBan(userId: string, ban: boolean) {
    setBanLoading(userId);
    setSuccessMsg("");
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ banned: ban }),
      });
      setSuccessMsg(ban ? "User banned." : "User unbanned.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBanLoading(null);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Moderation Queue</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {items.length} pending item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/appeals"
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          View Appeals
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {successMsg}
        </div>
      )}

      {items.length === 0 && !error && (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-zinc-500">No pending reports. The queue is clear.</p>
        </div>
      )}

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                    item.type === "post"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  }`}
                >
                  {item.type}
                </span>
                <span className="text-xs text-zinc-500">
                  {item.reportCount} report{item.reportCount !== 1 ? "s" : ""}
                </span>
                {item.author && (
                  <span className="text-xs text-zinc-500">
                    by{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {item.author.username ?? item.author.email ?? "unknown"}
                    </span>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(item, "APPROVED")}
                  disabled={actionLoading === item.key}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === item.key ? "..." : "Hide Content"}
                </button>
                <button
                  onClick={() => handleAction(item, "REJECTED")}
                  disabled={actionLoading === item.key}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Content */}
            <p className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700 line-clamp-4 dark:bg-zinc-800 dark:text-zinc-300">
              {item.content}
            </p>

            {/* Report reasons */}
            <div className="mt-3 space-y-1">
              {item.reports.map((r) => (
                <p key={r.id} className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-600 dark:text-zinc-400">Report reason:</span>{" "}
                  {r.reason}
                </p>
              ))}
            </div>

            {/* AI Verdict */}
            <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                AI Verdict
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {item.aiLabel ?? "—"}
                </span>
                <ScoreBadge score={item.aiScore} />
              </div>
              {item.aiReason && (
                <p className="mt-1 text-xs text-zinc-500 italic">{item.aiReason}</p>
              )}
            </div>

            {/* Ban author */}
            {item.author && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-zinc-500">Author action:</span>
                <button
                  onClick={() => handleBan(item.author!.id, true)}
                  disabled={banLoading === item.author.id}
                  className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {banLoading === item.author.id ? "..." : "Ban User"}
                </button>
                <button
                  onClick={() => handleBan(item.author!.id, false)}
                  disabled={banLoading === item.author.id}
                  className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Unban User
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
