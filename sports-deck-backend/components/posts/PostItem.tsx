"use client";

import { useState } from "react";
import { createReply } from "@/lib/posts";

type Reply = {
  id: string;
  content: string;
  author?: {
    username?: string;
  };
};

type Post = {
  id: string;
  content: string;
  author?: {
    username?: string;
  };
  replies?: Reply[];
};

export function PostItem({ post }: { post: Post }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState(post.replies || []);

  async function handleReply() {
    if (!replyText.trim()) return;

    try {
      const newReply = await createReply(replyText, post.id);

      // optimistic update
      setReplies((prev) => [...prev, newReply]);

      setReplyText("");
      setShowReply(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reply");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      {/* Post content */}
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        {post.content}
      </p>

      {post.author?.username && (
        <p className="mt-2 text-xs text-zinc-500">
          by {post.author.username}
        </p>
      )}

      {/* Reply button */}
      <button
        onClick={() => setShowReply((prev) => !prev)}
        className="mt-2 text-xs text-blue-500 hover:underline"
      >
        Reply
      </button>

      {/* Reply input */}
      {showReply && (
        <div className="mt-2 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            onClick={handleReply}
            className="rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-4 space-y-2 border-l pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <p>{reply.content}</p>
              <p className="text-xs text-zinc-500">
                {reply.author?.username}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}