import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
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
        return NextResponse.json(
          { error: "User is banned" },
          { status: 403 }
        );
      }
      throw err;
    }
    const body = await req.json();

    if (!Number.isInteger(body.threadId)) {
      return NextResponse.json({ error: "threadId must be an integer" }, { status: 400 });
    }

    if (!body.question || typeof body.question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    if (!Array.isArray(body.options) || body.options.length < 2) {
      return NextResponse.json(
        { error: "At least two options are required" },
        { status: 400 }
      );
    }

    const parsedDeadline = new Date(body.deadline);
    if (Number.isNaN(parsedDeadline.getTime())) {
      return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: { id: body.threadId }
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const poll = await prisma.poll.create({
      data: {
        threadId: body.threadId,
        question: body.question,
        deadline: parsedDeadline,
        options: {
          create: body.options.map((o: string) => ({ text: o }))
        }
      }
    });

    return NextResponse.json(poll);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create poll" },
      { status: 503 }
    );
  }
}