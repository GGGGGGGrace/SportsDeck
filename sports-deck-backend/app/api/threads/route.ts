import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const threads = await prisma.thread.findMany({
      include: {
        author: true,
        posts: true,
        tags: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const thread = await prisma.thread.create({
      data: {
        title: body.title,
        authorId: body.authorId,
        matchId: body.matchId ?? null,
      },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}