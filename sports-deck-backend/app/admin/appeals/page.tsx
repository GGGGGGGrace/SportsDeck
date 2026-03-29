"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type AppealUser = {
  id: string;
  username?: string;
  email?: string;
  banned: boolean;
};

type Appeal = {
  id: number;
  userId: string;
  reason: string;
  status: string;
  createdAt: string;
  user?: AppealUser;
};

export default function AdminAppealsPage() {
  const router = useRouter();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }

    async function fetchAppeals() {
      try {
        const data: Appeal[] = await apiFetch("/api/admin/appeals", {
          auth: true,
        });
        setAppeals(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAppeals();
  }, [router]);

  async function handleAction(appeal: Appeal, status: "APPROVED" | "REJECTED") {
    setActionLoading(appeal.id);
    setSuccessMsg("");
    try {
      await apiFetch(`/api/admin/appeals/${appeal.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status }),
      });
      setAppeals((prev) => prev.filter((a) => a.id !== appeal.id));
      setSuccessMsg(
        status === "APPROVED"
          ? `Appeal approved — user ${appeal.user?.username ?? appeal.userId} has been unbanned.`
          : "Appeal rejected."
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Ban Appeals</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {appeals.length} pending appeal{appeals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/queue"
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Moderation Queue
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {successMsg}
        </div>
      )}

      {appeals.length === 0 && !error && (
        <div className="rounded-2xl border border-zinc-200 bg-white/60 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-zinc-500">No pending appeals.</p>
        </div>
      )}

      <div className="space-y-4">
        {appeals.map((appeal) => (
          <div
            key={appeal.id}
            className="rounded-2xl border border-zinc-200 bg-white/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {appeal.user?.username ?? appeal.user?.email ?? appeal.userId}
                  </span>
                  {appeal.user?.banned && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Banned
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">
                    {new Date(appeal.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {appeal.user?.email && appeal.user?.username && (
                  <p className="mt-0.5 text-xs text-zinc-400">{appeal.user.email}</p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleAction(appeal, "APPROVED")}
                  disabled={actionLoading === appeal.id}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === appeal.id ? "..." : "Approve"}
                </button>
                <button
                  onClick={() => handleAction(appeal, "REJECTED")}
                  disabled={actionLoading === appeal.id}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Reject
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Appeal Reason
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{appeal.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
