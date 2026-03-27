import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const hasPostTarget = Number.isInteger(body.postId);
    const hasThreadTarget = Number.isInteger(body.threadId);

    if (!body.reason || typeof body.reason !== "string") {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    if (!hasPostTarget && !hasThreadTarget) {
      return NextResponse.json(
        { error: "Either postId or threadId must be provided" },
        { status: 400 }
      );
    }

    if (hasPostTarget) {
      const post = await prisma.post.findUnique({ where: { id: body.postId } });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }

    if (hasThreadTarget) {
      const thread = await prisma.thread.findUnique({ where: { id: body.threadId } });
      if (!thread) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }
    }

    const report = await prisma.report.create({
      data: {
        reporterId: authResult.userId,
        reason: body.reason,
        postId: hasPostTarget ? body.postId : null,
        threadId: hasThreadTarget ? body.threadId : null
      }
    });

    return NextResponse.json(report);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Report failed" },
        { status: 503 }
    );
  }
}