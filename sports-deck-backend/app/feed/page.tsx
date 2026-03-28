"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type TeamField = string | { name?: string; shortName?: string; tla?: string };

function teamName(t: TeamField): string {
  if (!t) return "Unknown";
  if (typeof t === "string") return t;
  return t.name ?? t.shortName ?? t.tla ?? "Unknown";
}

type FeedItem = {
  type: "post" | "reply" | "thread" | "match";
  id: string | number;
  content?: string;
  title?: string;
  createdAt: string;
  author?: { id: string; username?: string; avatarUrl?: string };
  thread?: { id: number; title: string };
  match?: {
    id: string;
    homeTeam: TeamField;
    awayTeam: TeamField;
    homeScore?: number;
    awayScore?: number;
    status: string;
  };
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function FeedCard({ item }: { item: FeedItem }) {
  const isMatch = item.type === "match";
  const isThread = item.type === "thread";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {item.author?.avatarUrl ? (
            <img
              src={item.author.avatarUrl}
              alt={item.author.username ?? ""}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-500 dark:bg-zinc-700">
              {(item.author?.username ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <Link
              href={`/users/${item.author?.id}`}
              className="text-sm font-semibold hover:underline"
            >
              {item.author?.username ?? "Unknown"}
            </Link>
            <p className="text-xs text-zinc-400">
              {item.type === "post"
                ? "posted"
                : item.type === "reply"
                ? "replied"
                : item.type === "thread"
                ? "created a thread"
                : "match update"}{" "}
              · {timeAgo(item.createdAt)}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isMatch
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : isThread
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {item.type}
        </span>
      </div>

      {/* Match mini-card */}
      {item.match && (
        <Link
          href={`/matches/${item.match.id}`}
          className="mb-3 flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800"
        >
          <span className="text-sm font-medium">{teamName(item.match.homeTeam)}</span>
          <span className="text-sm font-bold tabular-nums">
            {item.match.status === "FINISHED" || item.match.status === "IN_PLAY"
              ? `${item.match.homeScore ?? 0} – ${item.match.awayScore ?? 0}`
              : "vs"}
          </span>
          <span className="text-sm font-medium">{teamName(item.match.awayTeam)}</span>
        </Link>
      )}

      {/* Thread title (for thread-type items) */}
      {item.title && (
        <Link
          href={`/threads/${item.id}`}
          className="block font-semibold hover:underline"
        >
          {item.title}
        </Link>
      )}

      {/* Post/reply content */}
      {item.content && (
        <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300">
          {item.content}
        </p>
      )}

      {/* Parent thread link */}
      {item.thread && (
        <Link
          href={`/threads/${item.thread.id}`}
          className="mt-2 block text-xs text-blue-500 hover:underline"
        >
          in: {item.thread.title}
        </Link>
      )}
    </div>
  );
}

// Group consecutive posts/replies from same author in same thread (max 3)
function groupFeedItems(items: FeedItem[]) {
  const groups: FeedItem[][] = [];
  let current: FeedItem[] = [];

  items.forEach((item, i) => {
    if (i === 0) {
      current.push(item);
      return;
    }
    const prev = items[i - 1];
    const sameThread =
      item.thread?.id !== undefined && item.thread.id === prev.thread?.id;
    const sameAuthor = item.author?.id === prev.author?.id;

    if (sameThread && sameAuthor && current.length < 3) {
      current.push(item);
    } else {
      groups.push(current);
      current = [item];
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    apiFetch("/api/users/feed", { auth: true })
      .then((data) => {
        setItems(Array.isArray(data) ? data : (data.items ?? data.feed ?? []));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  if (error) return <p className="text-red-500">{error}</p>;

  const groups = groupFeedItems(items);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Your Feed</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Recent activity from people you follow and your favorite team
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 p-10 text-center dark:border-zinc-800">
          <p className="text-lg font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Follow users or set a favorite team to see updates here.
          </p>
          <Link
            href="/threads"
            className="mt-4 inline-block rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Browse Threads
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, gi) => {
            if (group.length === 1) {
              return <FeedCard key={gi} item={group[0]} />;
            }

            const first = group[0];
            return (
              <div
                key={gi}
                className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  {first.author?.avatarUrl ? (
                    <img
                      src={first.author.avatarUrl}
                      className="h-8 w-8 rounded-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold dark:bg-zinc-700">
                      {(first.author?.username ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/users/${first.author?.id}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {first.author?.username}
                    </Link>
                    <p className="text-xs text-zinc-400">
                      {group.length} posts in{" "}
                      <Link
                        href={`/threads/${first.thread?.id}`}
                        className="text-blue-500 hover:underline"
                      >
                        {first.thread?.title}
                      </Link>{" "}
                      · {timeAgo(first.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 border-l border-zinc-200 pl-4 dark:border-zinc-700">
                  {group.map((item) => (
                    <p
                      key={item.id}
                      className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300"
                    >
                      {item.content}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}