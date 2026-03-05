import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();

  const poll = await prisma.poll.create({
    data: {
      threadId: body.threadId,
      question: body.question,
      deadline: new Date(body.deadline),
      options: {
        create: body.options.map((o: string) => ({ text: o }))
      }
    }
  });

  return NextResponse.json(poll);
}