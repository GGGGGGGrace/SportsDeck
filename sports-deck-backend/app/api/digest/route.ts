export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { summarizeText } from "@/app/lib/huggingface";
import { getStandings } from "@/app/lib/footballApi";

export async function GET() {
  // --- Cache check: reuse digest if generated within last 24 hours ---
  const latestDigest = await prisma.digest.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const today = new Date();
  if (
    latestDigest &&
    today.getTime() - latestDigest.createdAt.getTime() < 86400000
  ) {
    return NextResponse.json({ content: latestDigest.content, cached: true });
  }

  // --- 1. Top 5 most-active threads (by post count) ---
  const threads = await prisma.thread.findMany({
    where: { hidden: false },
    include: {
      posts: { where: { hidden: false } },
    },
    orderBy: { posts: { _count: "desc" } },
    take: 5,
  });

  const threadsText = threads
    .map(
      (t: any) =>
        `Thread "${t.title}": ${t.posts
          .map((p: any) => p.content)
          .join(" ")
          .slice(0, 300)}`
    )
    .join("\n");

  // --- 2. Recent finished matches from DB ---
  const recentMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    orderBy: { matchDate: "desc" },
    take: 5,
  });

  const matchesText =
    recentMatches.length > 0
      ? "Recent results: " +
        recentMatches
          .map(
            (m: any) =>
              `${m.homeTeam} ${m.homeScore ?? 0}–${m.awayScore ?? 0} ${m.awayTeam}`
          )
          .join(", ")
      : "";

  // --- 3. Top-5 standings ---
  let standingsText = "";
  try {
    const standingsData = await getStandings();
    const top5 = standingsData.standings[0]?.table.slice(0, 5) ?? [];
    standingsText =
      "Top 5 standings: " +
      top5
        .map(
          (e: any) =>
            `${e.position}. ${e.team.name} — ${e.points} pts (${e.won}W ${e.draw}D ${e.lost}L)`
        )
        .join(", ");
  } catch {
    standingsText = "";
  }

  // --- Build combined input text ---
  const inputText = [threadsText, matchesText, standingsText]
    .filter(Boolean)
    .join("\n\n");

  // BART has a ~1024 token limit; trim to avoid errors
  const trimmed = inputText.slice(0, 3000);

  const ai = await summarizeText(trimmed);

  const summary =
    ai?.[0]?.summary_text ?? ai?.summary_text ?? trimmed.slice(0, 500);

  await prisma.digest.create({ data: { content: summary } });

  return NextResponse.json({ content: summary, cached: false });
}
