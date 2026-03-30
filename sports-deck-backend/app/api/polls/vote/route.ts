import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/app/lib/prisma";
import { authenticate, ensureNotBanned } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.userId;
    try {
      await ensureNotBanned(userId);
    } catch (err: any) {
      if (err.message === "User is banned") {
        return NextResponse.json({ error: "User is banned" }, { status: 403 });
      }
      throw err;
    }

    const body = await req.json();

    if (!Number.isInteger(body.optionId)) {
      return NextResponse.json(
        { error: "optionId must be an integer" },
        { status: 400 }
      );
    }

    const option = await prisma.pollOption.findUnique({
      where: { id: body.optionId },
      include: { poll: true },
    });

    if (!option) {
      return NextResponse.json(
        { error: "Poll option not found" },
        { status: 404 }
      );
    }

    // Enforce deadline
    if (new Date() > new Date(option.poll.deadline)) {
      return NextResponse.json(
        { error: "This poll has expired" },
        { status: 400 }
      );
    }

    // Prevent double voting in the same poll
    const allOptionIds = await prisma.pollOption
      .findMany({ where: { pollId: option.poll.id }, select: { id: true } })
      .then((opts: any[]) => opts.map((o: any) => o.id));

    const existingVote = await prisma.pollVote.findFirst({
      where: { optionId: { in: allOptionIds }, userId },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted in this poll" },
        { status: 409 }
      );
    }

    const vote = await prisma.pollVote.create({
      data: { optionId: body.optionId, userId },
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create vote" }, { status: 503 });
  }
}
