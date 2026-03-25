import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    // Group reports by post
    const reports = await prisma.report.groupBy({
      by: ["postId"],
      _count: {
        id: true
      },
      where: {
        postId: { not: null }
      }
    });

    // Fetch post + AI data
    const enriched = await Promise.all(
      reports.map(async (r: any) => {
        const post = await prisma.post.findUnique({
          where: { id: r.postId! },
          include: {
            author: true,
            thread: true
          }
        });

        return {
          postId: r.postId,
          reportCount: r._count.id,
          content: post?.content,
          author: post?.author?.username,
          threadTitle: post?.thread?.title,

          // AI verdict
          aiLabel: post?.aiModerationLabel,
          aiScore: post?.aiModerationScore,
          aiReason: post?.aiModerationReason
        };
      })
    );

    // Sort: AI score DESC, report count DESC
    enriched.sort((a, b) => {
      const scoreA = a.aiScore ?? 0;
      const scoreB = b.aiScore ?? 0;

      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.reportCount - a.reportCount;
    });

    return NextResponse.json(enriched);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch moderation queue" },
      { status: 500 }
    );
  }
}