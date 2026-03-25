import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate, ensureNotBanned } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.userId;
  await ensureNotBanned(userId);
  const body = await req.json();

  if (!Number.isInteger(body.optionId)) {
    return NextResponse.json({ error: "optionId must be an integer" }, { status: 400 });
  }

  const option = await prisma.pollOption.findUnique({
    where: { id: body.optionId }
  });

  if (!option) {
    return NextResponse.json({ error: "Poll option not found" }, { status: 404 });
  }

  const vote = await prisma.pollVote.create({
    data: {
      optionId: body.optionId,
      userId
    }
  });

  return NextResponse.json(vote);
}