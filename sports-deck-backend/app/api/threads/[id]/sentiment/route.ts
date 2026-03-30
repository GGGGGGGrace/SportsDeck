import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { analyzeSentiment } from "@/app/lib/huggingface";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const thread = await prisma.thread.findUnique({
    where: { id: Number(id) },
    include: {
      posts: {
        where: { hidden: false },
        include: { author: true },
      },
      match: true,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const isMatchThread = !!thread.match;

  // Full cache hit: overall + team sentiment (if match thread)
  const hasOverall = !!thread.sentimentLabel;
  const needsTeamSentiment =
    isMatchThread &&
    (!thread.homeTeamSentimentLabel || !thread.awayTeamSentimentLabel);

  if (hasOverall && !needsTeamSentiment) {
    return NextResponse.json({
      overall: { label: thread.sentimentLabel, score: thread.sentimentScore },
      homeTeam: thread.match
        ? {
            name: thread.match.homeTeam,
            label: thread.homeTeamSentimentLabel ?? null,
            score: thread.homeTeamSentimentScore ?? null,
          }
        : null,
      awayTeam: thread.match
        ? {
            name: thread.match.awayTeam,
            label: thread.awayTeamSentimentLabel ?? null,
            score: thread.awayTeamSentimentScore ?? null,
          }
        : null,
      cached: true,
    });
  }

  // --- Compute overall sentiment ---
  const allText = thread.posts
    .map((p: any) => p.content)
    .join("\n")
    .trim();

  let overallLabel: string | null = thread.sentimentLabel ?? null;
  let overallScore: number | null = thread.sentimentScore ?? null;

  if (!overallLabel && allText) {
    const ai = await analyzeSentiment(allText);
    const top = Array.isArray(ai?.[0]) ? ai[0][0] : ai?.[0];
    overallLabel = top?.label ?? null;
    overallScore = top?.score ?? null;
  }

  // --- Compute per-team sentiment for match threads ---
  let homeLabel: string | null = thread.homeTeamSentimentLabel ?? null;
  let homeScore: number | null = thread.homeTeamSentimentScore ?? null;
  let awayLabel: string | null = thread.awayTeamSentimentLabel ?? null;
  let awayScore: number | null = thread.awayTeamSentimentScore ?? null;
  let homeName: string | null = null;
  let awayName: string | null = null;

  if (isMatchThread && thread.match) {
    homeName = thread.match.homeTeam;
    awayName = thread.match.awayTeam;

    // Group posts by author's favorite team
    const homePosts = thread.posts.filter(
      (p: any) => p.author?.favoriteTeam === homeName
    );
    const awayPosts = thread.posts.filter(
      (p: any) => p.author?.favoriteTeam === awayName
    );

    if (!homeLabel && homePosts.length > 0) {
      const homeText = homePosts.map((p: any) => p.content).join("\n");
      const homeAi = await analyzeSentiment(homeText);
      const homeTop = Array.isArray(homeAi?.[0]) ? homeAi[0][0] : homeAi?.[0];
      homeLabel = homeTop?.label ?? null;
      homeScore = homeTop?.score ?? null;
    }

    if (!awayLabel && awayPosts.length > 0) {
      const awayText = awayPosts.map((p: any) => p.content).join("\n");
      const awayAi = await analyzeSentiment(awayText);
      const awayTop = Array.isArray(awayAi?.[0]) ? awayAi[0][0] : awayAi?.[0];
      awayLabel = awayTop?.label ?? null;
      awayScore = awayTop?.score ?? null;
    }
  }

  // Persist all sentiment results
  await prisma.thread.update({
    where: { id: thread.id },
    data: {
      sentimentLabel: overallLabel,
      sentimentScore: overallScore,
      ...(isMatchThread
        ? {
            homeTeamSentimentLabel: homeLabel,
            homeTeamSentimentScore: homeScore,
            awayTeamSentimentLabel: awayLabel,
            awayTeamSentimentScore: awayScore,
          }
        : {}),
    },
  });

  return NextResponse.json({
    overall: { label: overallLabel, score: overallScore },
    homeTeam: homeName
      ? { name: homeName, label: homeLabel, score: homeScore }
      : null,
    awayTeam: awayName
      ? { name: awayName, label: awayLabel, score: awayScore }
      : null,
    cached: false,
  });
}
