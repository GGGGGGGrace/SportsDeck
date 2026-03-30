"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type StandingEntry = {
  position: number;
  team: {
    id: number;
    name: string;
    crest?: string;
    shortName?: string;
    tla?: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string;
};

type Standing = {
  stage: string;
  type: string;
  group?: string;
  table: StandingEntry[];
};

function FormDot({ result }: { result: string }) {
  const color =
    result === "W"
      ? "bg-green-500"
      : result === "L"
      ? "bg-red-500"
      : "bg-zinc-400";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
      title={result === "W" ? "Win" : result === "L" ? "Loss" : "Draw"}
    />
  );
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeGroup, setActiveGroup] = useState(0);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await apiFetch("/api/standings");
        // backend may return { standings: [...] } or directly an array
        const list = Array.isArray(data) ? data : data.standings ?? [];
        setStandings(list);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>
    );

  if (error) return <p className="text-red-500">{error}</p>;

  const current = standings[activeGroup];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Standings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Current league table and form
        </p>
      </div>

      {/* Group tabs (if multiple) */}
      {standings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {standings.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveGroup(i)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeGroup === i
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {s.group ?? s.stage ?? `Group ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {current ? (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-center">MP</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">D</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center">GF</th>
                <th className="px-4 py-3 text-center">GA</th>
                <th className="px-4 py-3 text-center">GD</th>
                <th className="px-4 py-3 text-center font-bold text-zinc-900 dark:text-zinc-100">
                  PTS
                </th>
                <th className="hidden px-4 py-3 text-center md:table-cell">
                  Form
                </th>
              </tr>
            </thead>
            <tbody>
              {current.table.map((entry, i) => {
                const isTop = entry.position <= 4;
                const isRelegation =
                  entry.position > current.table.length - 3;

                return (
                  <tr
                    key={entry.team.id}
                    className={`border-b border-zinc-100 transition last:border-0 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40 ${
                      i === 0 ? "font-semibold" : ""
                    }`}
                  >
                    {/* Position */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            isTop
                              ? "bg-blue-500"
                              : isRelegation
                              ? "bg-red-500"
                              : "bg-transparent"
                          }`}
                        />
                        {entry.position}
                      </div>
                    </td>

                    {/* Team */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {entry.team.crest ? (
                          <img
                            src={entry.team.crest}
                            alt={entry.team.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        )}
                        <span className="hidden sm:inline">
                          {entry.team.name}
                        </span>
                        <span className="sm:hidden">
                          {entry.team.tla ?? entry.team.shortName ?? entry.team.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center text-zinc-500">
                      {entry.playedGames}
                    </td>
                    <td className="px-4 py-3 text-center">{entry.won}</td>
                    <td className="px-4 py-3 text-center text-zinc-500">
                      {entry.draw}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-500">
                      {entry.lost}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-500">
                      {entry.goalsFor}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-500">
                      {entry.goalsAgainst}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-500">
                      {entry.goalDifference > 0
                        ? `+${entry.goalDifference}`
                        : entry.goalDifference}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {entry.points}
                    </td>

                    {/* Form */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {entry.form
                          ? entry.form
                              .replace(/,/g, "")
                              .split("")
                              .slice(-5)
                              .map((r, fi) => (
                                <FormDot key={fi} result={r} />
                              ))
                          : <span className="text-xs text-zinc-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-400 dark:border-zinc-800">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
              Champions League
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              Relegation
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No standings available.</p>
      )}
    </div>
  );
}