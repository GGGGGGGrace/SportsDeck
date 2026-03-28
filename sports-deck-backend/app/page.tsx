import Link from "next/link";
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-100 via-white to-zinc-200 p-8 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            SportsDeck
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            A modern football discussion platform.
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Follow match discussions, browse standings, join threads, and keep up
            with your community.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/threads"
              className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Explore threads
            </Link>
            <Link
              href="/matches"
              className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              View matches
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-bold">Match discussions</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Browse general, team, and match-specific discussions.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-bold">Standings and fixtures</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Keep up with the latest table and upcoming games.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-bold">Community features</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Follow users, vote in polls, and track activity.
          </p>
        </div>
      </section>
    </div>
  );
}