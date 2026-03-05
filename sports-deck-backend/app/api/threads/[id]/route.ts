import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const thread = await prisma.thread.findUnique({
      where: {
        id: Number(params.id),
      },
      include: {
        author: true,
        posts: {
          include: {
            author: true,
            replies: {
              include: {
                author: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}