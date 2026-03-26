"use client";

import { useEffect, useState } from "react";
import { getThreads, createThread } from "@/lib/threads";
import { ThreadCard } from "@/components/threads/ThreadCard";
import { CreateThreadModal } from "@/components/threads/CreateThreadModal";
import { apiFetch } from "@/lib/api";

export default function ThreadsPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchThreads() {
      try {
        const data = await getThreads();
        setThreads(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchThreads();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      getThreads().then(setThreads);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        let url = "/api/threads/search?";

        if (filter === "all") {
          url += `q=${encodeURIComponent(query)}`;
        } else if (filter === "title") {
          url += `title=${encodeURIComponent(query)}`;
        } else if (filter === "author") {
          url += `author=${encodeURIComponent(query)}`;
        } else if (filter === "tag") {
          url += `tag=${encodeURIComponent(query)}`;
        } else if (filter === "team") {
          url += `teamId=${encodeURIComponent(query)}`;
        }

        const data = await apiFetch(url);

        setThreads(data);
      } catch (err) {
        console.error(err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, filter]);

  async function handleCreateThread(data: {
    title: string;
    content: string;
    tags: string[];
  }) {
    try {
      const newThread = await createThread(data);
      setThreads((prev: any[]) => [newThread, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to create thread");
    }
  }

  if (loading) return <p>Loading threads...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Threads</h1>
        <CreateThreadModal onSubmit={handleCreateThread} />
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="tag">Tag</option>
          <option value="team">Team ID</option>
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search by ${filter}...`}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {/* Thread List */}
      {threads.length === 0 ? (
        <p>No threads found.</p>
      ) : (
        <div className="grid gap-4">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}