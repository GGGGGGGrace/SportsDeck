import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { classifyText } from "@/app/lib/huggingface";
import { authenticate } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authResult = authenticate(req);
    const authorId = authResult instanceof NextResponse ? null : authResult.userId;

    if (!authorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!body.content || !body.threadId) {
      return NextResponse.json(
        { error: "content and threadId are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        content: body.content,
        threadId: body.threadId,
        authorId: authorId,
      },
    });
    // Check if moderation result already exists (cache)
    let moderationLabel: string | null = null;
    let moderationScore: number | null = null;

    // Run HuggingFace only once
    const aiResult = await classifyText(
      "unitary/toxic-bert",
      body.content
    );

    const top = Array.isArray(aiResult?.[0]) ? aiResult[0][0] : aiResult?.[0];

    if (top && typeof top.label === "string" && typeof top.score === "number") {

      moderationLabel = top.label;
      moderationScore = top.score;

      // Save AI result (cache)
      await prisma.post.update({
        where: { id: post.id },
        data: {
          aiModerationLabel: moderationLabel,
          aiModerationScore: moderationScore
        }
      });
    }

    if (
      moderationLabel &&
      moderationLabel.toLowerCase().includes("toxic") &&
      moderationScore &&
      moderationScore > 0.7
    ) {

      await prisma.report.create({
        data: {
          reporterId: body.authorId,
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
    return NextResponse.json({ error: "Failed to create post" }, { status: 503 });
  }
}