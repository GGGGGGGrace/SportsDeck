"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Team = {
  id?: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

type Match = {
  id: string | number;
  matchday: number;
  stage: string;
  date: string;
  status: string;
  venue?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    fullTime?: { home: number | null; away: number | null } | null;
    halfTime?: { home: number | null; away: number | null } | null;
  };
  threads?: { id: number; title: string }[];
};

function teamName(t: Team): string {
  if (!t) return "Unknown";
  return t.name ?? t.shortName ?? t.tla ?? "Unknown";
}

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMatch() {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/matches/${id}`);
        setMatch(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch match");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchMatch();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 py-10 text-center">{error}</p>;
  }

  if (!match) {
    return <p className="py-10 text-center">Match not found.</p>;
  }

  const matchDate = new Date(match.date); 
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";

  const homeName = teamName(match.homeTeam);
  const awayName = teamName(match.awayTeam);
  const homeCrest = match.homeTeam?.crest;
  const awayCrest = match.awayTeam?.crest;

  const homeScore = match.score?.fullTime?.home ?? null;
  const awayScore = match.score?.fullTime?.away ?? null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        ← Back to Matches
      </Link>

      {/* Match hero */}
      <div className="rounded-3xl border border-zinc-200 bg-white/60 p-8 dark:border-zinc-800 dark:bg-zinc-900/60">
        
        {/* Status */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
              isLive
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                : isFinished
                ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {isLive && (
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
            )}
            {isLive ? "LIVE" : isFinished ? "Full Time" : "Upcoming"}
          </span>
          {match.stage && (
            <span className="text-sm font-medium text-zinc-500">{match.stage.replace(/_/g, " ")}</span>
          )}
        </div>

        {/* Teams & score */}
        <div className="flex items-center justify-between gap-6">
          {/* Home */}
          <div className="flex flex-1 flex-col items-center gap-3 text-center">
            {homeCrest ? (
              <img src={homeCrest} alt={homeName} className="h-24 w-24 object-contain" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-4xl dark:bg-zinc-800">
                ⚽
              </div>
            )}
            <span className="text-xl font-bold">{homeName}</span>
          </div>

          {/* Score OR Time */}
          <div className="flex flex-col items-center gap-2 text-center px-4">
            {isFinished || isLive ? (
              <span className="text-5xl font-black tabular-nums tracking-tight">
                {homeScore ?? 0} <span className="text-zinc-300 dark:text-zinc-700 mx-1">-</span> {awayScore ?? 0}
              </span>
            ) : (
              <>
                <span className="text-3xl font-bold text-zinc-300 dark:text-zinc-600 mb-2">
                  VS
                </span>
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                  {isNaN(matchDate.getTime()) ? "TBD" : matchDate.toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-sm font-medium text-zinc-500">
                  {isNaN(matchDate.getTime()) ? "" : matchDate.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </>
            )}
            {match.matchday > 0 && (
              <span className="mt-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Matchday {match.matchday}
              </span>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-1 flex-col items-center gap-3 text-center">
            {awayCrest ? (
              <img src={awayCrest} alt={awayName} className="h-24 w-24 object-contain" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 text-4xl dark:bg-zinc-800">
                ⚽
              </div>
            )}
            <span className="text-xl font-bold">{awayName}</span>
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <p className="mt-8 text-center text-sm font-medium text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/50 pt-4">
            📍 {match.venue}
          </p>
        )}
      </div>

      {/* Match threads */}
      <div>
        <h2 className="mb-4 text-xl font-bold">Match Discussion</h2>
        {match.threads && match.threads.length > 0 ? (
          <div className="space-y-3">
            {match.threads.map((thread) => (
              <Link
                key={thread.id}
                href={`/threads/${thread.id}`}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
              >
                <span className="font-semibold">{thread.title}</span>
                <span className="text-zinc-400">→</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/20">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              No discussion threads yet for this match.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}