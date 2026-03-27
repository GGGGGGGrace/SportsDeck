"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Team = { id: number; name: string; crest?: string };

type UserProfile = {
  id: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  favoriteTeam?: string;
  role: string;
  createdAt: string;
  _count?: {
    threads: number;
    posts: number;
    replies: number;
    followers: number;
    following: number;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function fetchData() {
      try {
        const [profileData, teamsRaw] = await Promise.all([
          apiFetch("/api/users/profile", { auth: true }),
          apiFetch("/api/teams").catch(() => []),
        ]);

        setProfile(profileData);
        setUsername(profileData.username ?? "");
        setAvatarUrl(profileData.avatarUrl ?? "");
        setFavoriteTeam(profileData.favoriteTeam ?? "");

        // normalise teams response shape
        const teamsArr: Team[] = Array.isArray(teamsRaw)
          ? teamsRaw
          : teamsRaw.teams ?? teamsRaw.data ?? [];
        setTeams(teamsArr);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiFetch("/api/users/profile", {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ username, avatarUrl, favoriteTeam }),
      });
      setProfile(updated);
      setSuccess("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  if (!profile)
    return <p className="text-red-500">{error || "Could not load profile."}</p>;

  const stats = [
    { label: "Threads", value: profile._count?.threads ?? 0 },
    { label: "Posts", value: profile._count?.posts ?? 0 },
    { label: "Replies", value: profile._count?.replies ?? 0 },
    { label: "Followers", value: profile._count?.followers ?? 0 },
    { label: "Following", value: profile._count?.following ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile header */}
      <div className="rounded-3xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200 text-3xl font-bold text-zinc-500 dark:bg-zinc-800">
              {(username || profile.email || "?")[0]?.toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-black">
              {profile.username ?? profile.email}
            </h1>
            <p className="text-sm text-zinc-500">{profile.email ?? ""}</p>
            <p className="mt-1 text-xs text-zinc-400">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-5 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-3xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="mb-4 text-lg font-bold">Edit Profile</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm transition focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Avatar URL
            </label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm transition focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
            />
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="preview"
                className="mt-2 h-12 w-12 rounded-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Favorite Team
            </label>
            {teams.length > 0 ? (
              <select
                value={favoriteTeam}
                onChange={(e) => setFavoriteTeam(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm transition focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">— No preference —</option>
                {teams.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={favoriteTeam}
                onChange={(e) => setFavoriteTeam(e.target.value)}
                placeholder="Team name"
                className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm transition focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
              />
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}