import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authResult = authenticate(req);
    const authorId = authResult instanceof NextResponse ? null : authResult.userId;

    if (!authorId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!body.content || !body.threadId) {
      return NextResponse.json(
        { error: "content and threadId are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        content: body.content,
        threadId: body.threadId,
        authorId: authorId,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 503 });
  }
}