"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type TeamField = string | { id?: number; name?: string; shortName?: string; tla?: string; crest?: string };

type Match = {
  id: string;
  externalId: number;
  homeTeam: TeamField;
  awayTeam: TeamField;
  homeTeamCrest?: string;
  awayTeamCrest?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  matchday: number;
  matchDate: string;
  venue?: string;
  stage?: string;
};

function teamName(t: TeamField): string {
  if (typeof t === "string") return t;
  return t?.name ?? t?.shortName ?? t?.tla ?? "Unknown";
}

function teamCrest(t: TeamField, fallback?: string): string | undefined {
  if (typeof t === "string") return fallback;
  return t?.crest ?? fallback;
}

function MatchCard({ match }: { match: Match }) {
  const date = new Date(match.matchDate);
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isUpcoming = !isFinished && !isLive;

  const homeName = teamName(match.homeTeam);
  const awayName = teamName(match.awayTeam);
  const homeCrest = teamCrest(match.homeTeam, match.homeTeamCrest);
  const awayCrest = teamCrest(match.awayTeam, match.awayTeamCrest);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-2xl border border-zinc-200 bg-white/60 p-5 transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
    >
      {/* Status badge + date */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isLive
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : isFinished
              ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          }`}
        >
          {isLive && (
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          )}
          {isLive ? "LIVE" : isFinished ? "FT" : "Upcoming"}
        </span>
        <span className="text-xs text-zinc-400">
          {isUpcoming
            ? date.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
        </span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center justify-between gap-4">
        {/* Home team */}
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          {homeCrest ? (
            <img
              src={homeCrest}
              alt={homeName}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg dark:bg-zinc-800">
              ⚽
            </div>
          )}
          <span className="text-sm font-semibold leading-tight">{homeName}</span>
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center gap-1">
          {isFinished || isLive ? (
            <span className="text-2xl font-black tabular-nums tracking-tight">
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-lg font-bold text-zinc-400">vs</span>
          )}
          {match.matchday > 0 && (
            <span className="text-xs text-zinc-400">MD {match.matchday}</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          {awayCrest ? (
            <img
              src={awayCrest}
              alt={awayName}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg dark:bg-zinc-800">
              ⚽
            </div>
          )}
          <span className="text-sm font-semibold leading-tight">{awayName}</span>
        </div>
      </div>

      {/* Venue */}
      {match.venue && (
        <p className="mt-3 text-center text-xs text-zinc-400">{match.venue}</p>
      )}
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null);
  const [matchdays, setMatchdays] = useState<number[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "finished" | "live">("all");

  useEffect(() => {
    async function fetchMatches() {
      try {
        const raw = await apiFetch("/api/matches");
        const data: Match[] = Array.isArray(raw)
          ? raw
          : raw.matches ?? raw.data ?? [];
        setMatches(data);

        const days = [...new Set(data.map((m) => m.matchday))].filter(Boolean).sort((a, b) => a - b);
        setMatchdays(days);
        if (days.length > 0) setActiveMatchday(days[days.length - 1]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const filtered = matches.filter((m) => {
    const matchdayOk = activeMatchday === null || m.matchday === activeMatchday;
    const statusOk =
      filter === "all" ||
      (filter === "live" && (m.status === "IN_PLAY" || m.status === "PAUSED")) ||
      (filter === "finished" && m.status === "FINISHED") ||
      (filter === "upcoming" &&
        m.status !== "FINISHED" &&
        m.status !== "IN_PLAY" &&
        m.status !== "PAUSED");
    return matchdayOk && statusOk;
  });

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Matches</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse fixtures, results and live scores
        </p>
      </div>

      {/* Matchday tabs */}
      {matchdays.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveMatchday(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeMatchday === null
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {matchdays.map((md) => (
            <button
              key={md}
              onClick={() => setActiveMatchday(md)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeMatchday === md
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              MD {md}
            </button>
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {(["all", "upcoming", "live", "finished"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
              filter === f
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Match grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No matches found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}