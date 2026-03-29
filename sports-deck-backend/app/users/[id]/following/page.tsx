"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type FollowedUser = {
  id: string;
  username?: string;
  avatarUrl?: string;
  favoriteTeam?: string;
  followedAt: string;
};

function timeAgo(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function FollowingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(localStorage.getItem("userId"));

    apiFetch(`/api/users/${id}/following?limit=100`)
      .then((data) => {
        setFollowing(data.following ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUnfollow(targetId: string) {
    if (!confirm("Unfollow this user?")) return;
    try {
      await apiFetch(`/api/users/${targetId}/follow`, {
        method: "DELETE",
        auth: true,
      });
      setFollowing((prev) => prev.filter((u) => u.id !== targetId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      alert(err.message || "Failed to unfollow.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/users/${id}`}
          className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ← Back to profile
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-black tracking-tight">Following</h1>
        <p className="text-sm text-zinc-500">
          Following {total} user{total !== 1 ? "s" : ""}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && following.length === 0 && (
        <p className="text-sm text-zinc-500">Not following anyone yet.</p>
      )}

      <div className="space-y-3">
        {following.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <Link href={`/users/${u.id}`} className="flex items-center gap-3 hover:opacity-80">
              {u.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt={u.username ?? ""}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-lg font-bold text-zinc-500 dark:bg-zinc-800">
                  {(u.username ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold">{u.username ?? "Anonymous"}</p>
                {u.favoriteTeam && (
                  <p className="text-xs text-zinc-500">⚽ {u.favoriteTeam}</p>
                )}
                <p className="text-xs text-zinc-400">followed {timeAgo(u.followedAt)}</p>
              </div>
            </Link>

            {/* The logged-in user can unfollow from their own following list */}
            {currentUserId === id && (
              <button
                onClick={() => handleUnfollow(u.id)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-400 transition hover:border-red-300 hover:text-red-500 dark:border-zinc-700"
              >
                Unfollow
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
