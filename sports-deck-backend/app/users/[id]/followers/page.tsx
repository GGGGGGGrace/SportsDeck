"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Follower = {
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

export default function FollowersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(localStorage.getItem("userId"));

    apiFetch(`/api/users/${id}/followers?limit=100`)
      .then((data) => {
        setFollowers(data.followers ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRemove(followerId: string) {
    if (!confirm("Remove this follower?")) return;
    try {
      await apiFetch(`/api/users/${id}/followers/${followerId}`, {
        method: "DELETE",
        auth: true,
      });
      setFollowers((prev) => prev.filter((f) => f.id !== followerId));
      setTotal((t) => t - 1);
    } catch (err: any) {
      alert(err.message || "Failed to remove follower.");
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
        <h1 className="text-2xl font-black tracking-tight">Followers</h1>
        <p className="text-sm text-zinc-500">{total} follower{total !== 1 ? "s" : ""}</p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && followers.length === 0 && (
        <p className="text-sm text-zinc-500">No followers yet.</p>
      )}

      <div className="space-y-3">
        {followers.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <Link href={`/users/${f.id}`} className="flex items-center gap-3 hover:opacity-80">
              {f.avatarUrl ? (
                <img
                  src={f.avatarUrl}
                  alt={f.username ?? ""}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-lg font-bold text-zinc-500 dark:bg-zinc-800">
                  {(f.username ?? "?")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold">{f.username ?? "Anonymous"}</p>
                {f.favoriteTeam && (
                  <p className="text-xs text-zinc-500">⚽ {f.favoriteTeam}</p>
                )}
                <p className="text-xs text-zinc-400">followed {timeAgo(f.followedAt)}</p>
              </div>
            </Link>

            {/* Only the profile owner can remove followers */}
            {currentUserId === id && (
              <button
                onClick={() => handleRemove(f.id)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-400 transition hover:border-red-300 hover:text-red-500 dark:border-zinc-700"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
