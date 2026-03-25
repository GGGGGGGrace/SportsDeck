import { NextRequest, NextResponse } from "next/server";
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

    if (!Number.isInteger(body.optionId)) {
      return NextResponse.json(
        { error: "optionId must be an integer" },
        { status: 400 }
      );
    }

    const option = await prisma.pollOption.findUnique({
      where: { id: body.optionId }
    });

    if (!option) {
      return NextResponse.json(
        { error: "Poll option not found" },
        { status: 404 }
      );
    }
    const vote = await prisma.pollVote.create({
      data: {
        optionId: body.optionId,
        userId
      }
    });

    return NextResponse.json(vote);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create vote" },
      { status: 503 }
    );
  }
}