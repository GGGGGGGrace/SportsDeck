import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
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
        authorId: authorId,
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 503 });
  }
}