"use client";

import { useEffect, useState } from "react";
import { getThreads, createThread } from "@/lib/threads";
import { ThreadCard } from "@/components/threads/ThreadCard";
import { CreateThreadModal } from "@/components/threads/CreateThreadModal";

export default function ThreadsPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchThreads() {
      try {
        const data = await getThreads();

        console.log("THREAD LIST:", data);

        // adjust if backend wraps response
        setThreads(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchThreads();
  }, []);

  async function handleCreateThread(data: {
    title: string;
    content: string;
    tags: string[];
  }) {
    try {
      const newThread = await createThread(data);

      // optimistic update
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Threads</h1>
        <CreateThreadModal onSubmit={handleCreateThread} />
      </div>

      {threads.length === 0 ? (
        <p>No threads yet.</p>
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