import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const poll = await prisma.poll.findUnique({
      where: { id: Number(id) },
      include: {
        options: {
          include: { votes: true },
        },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    return NextResponse.json(poll);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Poll fetch failed" }, { status: 503 });
  }
}

/**
 * PATCH /api/polls/[id]
 * Edit a poll's question or deadline (owner only, before deadline).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const pollId = Number(id);

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { thread: { select: { authorId: true } } },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const isOwner = poll.thread.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: { question?: string; deadline?: Date } = {};

    if (body.question && typeof body.question === "string") {
      updateData.question = body.question.trim();
    }

    if (body.deadline) {
      const parsed = new Date(body.deadline);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
      }
      updateData.deadline = parsed;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Poll update failed" }, { status: 503 });
  }
}

/**
 * DELETE /api/polls/[id]
 * Delete a poll and all its options/votes (owner or admin).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const pollId = Number(id);

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        thread: { select: { authorId: true } },
        options: { include: { votes: true } },
      },
    });

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const isOwner = poll.thread.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete votes → options → poll in order
    const optionIds = poll.options.map((o: any) => o.id);
    await prisma.pollVote.deleteMany({ where: { optionId: { in: optionIds } } });
    await prisma.pollOption.deleteMany({ where: { pollId } });
    await prisma.poll.delete({ where: { id: pollId } });

    return NextResponse.json({ message: "Poll deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Poll delete failed" }, { status: 503 });
  }
}
