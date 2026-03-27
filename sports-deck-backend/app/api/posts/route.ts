import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { classifyText } from "@/app/lib/huggingface";
import { authenticate, ensureNotBanned } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const authorId = authResult.userId;
    try {
      await ensureNotBanned(authorId);
    } catch (err: any) {
      if (err.message === "User is banned") {
        return NextResponse.json(
          { error: "User is banned" },
          { status: 403 }
        );
      }
      throw err;
    }
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const threadId = Number(body.threadId);
    if (!content || !Number.isInteger(threadId) || threadId <= 0) {
      return NextResponse.json(
        { error: "valid content and threadId are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        content,
        threadId,
        authorId
      },
    });

    let moderationLabel: string | null = null;
    let moderationScore: number | null = null;
    try {
      const aiResult = await classifyText("unitary/toxic-bert", content);
      const top = Array.isArray(aiResult?.[0]) ? aiResult[0][0] : aiResult?.[0];
      if (top && typeof top.label === "string" && typeof top.score === "number") {
        moderationLabel = top.label;
        moderationScore = top.score;

        await prisma.post.update({
          where: { id: post.id },
          data: {
            aiModerationLabel: moderationLabel,
            aiModerationScore: moderationScore
          }
        });
      }
    } catch (e) {
      console.error("AI moderation failed", e);
    }

    if (
      moderationLabel &&
      moderationLabel.toLowerCase().includes("toxic") &&
      moderationScore !== null &&
      moderationScore > 0.7
    ) {
      await prisma.report.create({
        data: {
          reporterId: authorId,
          reason: "AUTO_FLAGGED",
          postId: post.id,
          aiLabel: moderationLabel,
          aiScore: moderationScore,
          aiReason: "Auto-flagged by HuggingFace moderation model"
        }
      });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 503 }
    );
  }
}