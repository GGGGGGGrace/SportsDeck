import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const vote = await prisma.pollVote.create({
    data: {
      optionId: body.optionId,
      userId: body.userId
    }
  });

  return NextResponse.json(vote);
}