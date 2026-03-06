import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function GET() {
  try {
    const threads = await prisma.thread.findMany({
      where: {
        hidden: false
      },
      include: {
        author: true,
        posts: {
          where: {
            hidden: false
          },
          include: {
            replies: true
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate: use userId from JWT token
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;
    const authorId = authResult.userId;

    const body = await req.json();
    const { title, content, matchId, tags } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    // Prevent duplicate threads for the same match
    if (matchId) {
      const existingThread = await prisma.thread.findFirst({
        where: { matchId },
      });
      if (existingThread) {
        return NextResponse.json(
          { error: "A thread for this match already exists" },
          { status: 409 }
        );
      }
    }

    const thread = await prisma.thread.create({
      data: {
        title,
        authorId,
        matchId: matchId ?? null
      }
    });

    await prisma.post.create({
      data: {
        content,
        threadId: thread.id,
        authorId
      }
    });

    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName }
        });

        await prisma.threadTag.create({
          data: {
            threadId: thread.id,
            tagId: tag.id
          }
        });
      }
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 503 });
  }
}