import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

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
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { title, content, authorId, matchId, tags } = body;

    if (!title || !content || !authorId) {
      return NextResponse.json(
        { error: "title, content, and authorId required" },
        { status: 400 }
      );
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
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}