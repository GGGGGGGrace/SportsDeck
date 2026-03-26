"use client";

import Link from "next/link";

type Thread = {
  id: string;
  title: string;
  content?: string;
  createdAt?: string;
  author?: {
    username?: string;
  };
  tags?: {
    tag?: {
      id: number | string;
      name: string;
    };
  }[];
};

export function ThreadCard({ thread }: { thread: Thread }) {
  return (
    <Link
      href={`/threads/${thread.id}`}
      className="block rounded-2xl border border-zinc-200 bg-white/60 p-5 transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <h2 className="text-lg font-semibold">{thread.title}</h2>

      {thread.author?.username && (
        <p className="mt-1 text-sm text-zinc-500">
          by {thread.author.username}
        </p>
      )}

      {thread.content && (
        <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
          {thread.content}
        </p>
      )}

      {thread.tags && thread.tags.length > 0 && (
        <div className="mt-3 text-sm">
          {thread.tags.map((tagItem, index) => {
            const tagName = tagItem?.tag?.name || "unknown";

            return (
              <span key={index}>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  #{tagName}
                </span>{" "}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
}