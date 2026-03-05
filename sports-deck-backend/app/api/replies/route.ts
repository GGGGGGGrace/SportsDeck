import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const reply = await prisma.reply.create({
      data: {
        content: body.content,
        postId: body.postId,
        authorId: body.authorId,
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}