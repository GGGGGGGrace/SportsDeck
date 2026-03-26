"use client";

import { useState } from "react";

export function CreateThreadModal({
  onSubmit,
}: {
  onSubmit: (data: {
    title: string;
    content: string;
    tags: string[];
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) return;

    setLoading(true);

    await onSubmit({
      title,
      content,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });

    setTitle("");
    setContent("");
    setTags("");
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      {/* Open button */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
      >
        + Create Thread
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-xl font-semibold">New Thread</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Content"
                className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
              />

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="w-full rounded-lg border px-3 py-2 dark:bg-zinc-800"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}