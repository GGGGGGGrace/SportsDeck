"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

type UserPublic = {
  id: string;
  username?: string;
  avatarUrl?: string;
  favoriteTeam?: string;
  createdAt: string;
  _count?: {
    threads: number;
    posts: number;
    replies: number;
    followers: number;
    following: number;
  };
  threads?: { id: number; title: string; createdAt: string }[];
  posts?: {
    id: number;
    content: string;
    createdAt: string;
    thread?: { id: number; title: string };
  }[];
  replies?: { id: number; content: string; createdAt: string }[];
  isFollowing?: boolean;
};

function ActivityChart({ userId }: { userId: string }) {
  const [data, setData] = useState<{ week: string; count: number }[]>([]);

  useEffect(() => {
    apiFetch(`/api/users/${userId}/activity`)
      .then((res) => {
        if (Array.isArray(res)) setData(res);
        else if (res.activity && Array.isArray(res.activity)) setData(res.activity);
        else throw new Error("no data");
      })
      .catch(() => {
        // Show empty placeholder bars if endpoint is missing
        setData(
          Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, count: 0 }))
        );
      });
  }, [userId]);

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Activity (last 12 weeks)
      </h3>
      <div className="flex h-20 items-end gap-1.5">
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex flex-1 flex-col items-center justify-end"
          >
            <div
              className="w-full rounded-t-sm bg-zinc-900 transition-all dark:bg-zinc-100"
              style={{
                height: `${(d.count / max) * 100}%`,
                minHeight: d.count > 0 ? "4px" : "1px",
                opacity: d.count === 0 ? 0.15 : 1,
              }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
              {d.count} posts
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-400">
        <span>{data[0]?.week}</span>
        <span>{data[data.length - 1]?.week}</span>
      </div>
    </div>
  );
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"threads" | "posts" | "replies">("threads");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));

    async function fetchUser() {
      try {
        const data = await apiFetch(`/api/users/${id}`);
        setUser(data);
        setFollowing(data.isFollowing ?? false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [id]);

  async function handleFollow() {
    if (!isLoggedIn) return;
    setFollowLoading(true);
    try {
      if (following) {
        await apiFetch(`/api/users/${id}/follow`, { method: "DELETE", auth: true });
        setFollowing(false);
        setUser((u) =>
          u
            ? {
                ...u,
                _count: {
                  threads: u._count?.threads ?? 0,
                  posts: u._count?.posts ?? 0,
                  replies: u._count?.replies ?? 0,
                  following: u._count?.following ?? 0,
                  followers: Math.max((u._count?.followers ?? 1) - 1, 0),
                },
              }
            : u
        );
      } else {
        await apiFetch(`/api/users/${id}/follow`, { method: "POST", auth: true });
        setFollowing(true);
        setUser((u) =>
          u
            ? {
                ...u,
                _count: {
                  threads: u._count?.threads ?? 0,
                  posts: u._count?.posts ?? 0,
                  replies: u._count?.replies ?? 0,
                  following: u._count?.following ?? 0,
                  followers: (u._count?.followers ?? 0) + 1,
                },
              }
            : u
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  if (error || !user)
    return <p className="text-red-500">{error || "User not found."}</p>;

  const stats = [
    { label: "Threads", value: user._count?.threads ?? 0, href: null },
    { label: "Posts", value: user._count?.posts ?? 0, href: null },
    { label: "Followers", value: user._count?.followers ?? 0, href: `/users/${id}/followers` },
    { label: "Following", value: user._count?.following ?? 0, href: `/users/${id}/following` },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile header */}
      <div className="rounded-3xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username ?? ""}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 text-2xl font-bold text-zinc-500 dark:bg-zinc-800">
                {(user.username ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black">{user.username ?? "Anonymous"}</h1>
              {user.favoriteTeam && (
                <p className="text-sm text-zinc-500">⚽ {user.favoriteTeam}</p>
              )}
              <p className="text-xs text-zinc-400">
                Joined{" "}
                {new Date(user.createdAt).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {isLoggedIn && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                following
                  ? "border border-zinc-300 hover:border-red-300 hover:text-red-500 dark:border-zinc-700"
                  : "bg-zinc-900 text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
              }`}
            >
              {followLoading ? "..." : following ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {stats.map((s) => (
            s.href ? (
              <Link key={s.label} href={s.href} className="text-center hover:opacity-75 transition">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-blue-500 hover:underline">{s.label}</p>
              </Link>
            ) : (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-zinc-400">{s.label}</p>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Activity chart */}
      <ActivityChart userId={id} />

      {/* Tabs */}
      <div>
        <div className="mb-4 flex gap-2">
          {(["threads", "posts", "replies"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {activeTab === "threads" &&
            (user.threads?.length ? (
              user.threads.map((t) => (
                <Link
                  key={t.id}
                  href={`/threads/${t.id}`}
                  className="block rounded-2xl border border-zinc-200 bg-white/60 px-5 py-4 transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <p className="font-medium">{t.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(t.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No threads yet.</p>
            ))}

          {activeTab === "posts" &&
            (user.posts?.length ? (
              user.posts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-zinc-200 bg-white/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <p className="line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {p.content}
                  </p>
                  {p.thread && (
                    <Link
                      href={`/threads/${p.thread.id}`}
                      className="mt-1 text-xs text-blue-500 hover:underline"
                    >
                      in: {p.thread.title}
                    </Link>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No posts yet.</p>
            ))}

          {activeTab === "replies" &&
            (user.replies?.length ? (
              user.replies.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-zinc-200 bg-white/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/60"
                >
                  <p className="line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {r.content}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(r.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No replies yet.</p>
            ))}
        </div>
      </div>
    </div>
  );
}