"use client";

import Link from "next/link";

type Thread = {
  id: string;
  title: string;
  content?: string;
  createdAt?: string;
  author?: {
    id?: string;
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
    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-5 transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60">
      <Link href={`/threads/${thread.id}`} className="block">
        <h2 className="text-lg font-semibold hover:underline">{thread.title}</h2>
      </Link>

      {thread.author?.username && (
        <p className="mt-1 text-sm text-zinc-500">
          by{" "}
          {thread.author.id ? (
            <Link
              href={`/users/${thread.author.id}`}
              className="font-medium text-zinc-700 hover:underline dark:text-zinc-300"
            >
              {thread.author.username}
            </Link>
          ) : (
            thread.author.username
          )}
        </p>
      )}

      {thread.content && (
        <Link href={`/threads/${thread.id}`} className="block">
          <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
            {thread.content}
          </p>
        </Link>
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
    </div>
  );
}