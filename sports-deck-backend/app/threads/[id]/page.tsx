"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { getThreadById } from "@/lib/threads";
import { createPost } from "@/lib/posts";
import { PostItem } from "@/components/posts/PostItem";
import { ReplyInput } from "@/components/posts/ReplyInput";

type Thread = {
  id: string;
  title: string;
  content?: string;
  author?: {
    username?: string;
  };
};

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

  useEffect(() => {
    async function fetchThread() {
      try {
        const data = await getThreadById(id);

        console.log("THREAD DATA:", data);

        // adjust if your backend wraps data differently
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

  async function handleCreatePost(content: string) {
    try {
      const newPost = await createPost(content, id);

      // optimistic update
      setPosts((prev) => [newPost, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to create post");
    }
  }

  if (loading) return <p>Loading thread...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!thread) return <p>Thread not found.</p>;

  return (
    <div className="space-y-6">
      {/* Thread Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
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

      {/* Discussion Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Discussion</h2>

        {/* Create Post */}
        <h3 className="text-sm text-zinc-500">Create a post</h3>
        <ReplyInput onSubmit={handleCreatePost} />

        {/* Posts */}
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
  );
}