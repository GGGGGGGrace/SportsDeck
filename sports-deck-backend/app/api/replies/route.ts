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

    if (!body.content || !body.postId) {
      return NextResponse.json(
        { error: "content and postId are required" },
        { status: 400 }
      );
    }

    const reply = await prisma.reply.create({
      data: {
        content: body.content,
        postId: body.postId,
        authorId: userId,
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create reply" },
      { status: 503 }
    );
  }
}