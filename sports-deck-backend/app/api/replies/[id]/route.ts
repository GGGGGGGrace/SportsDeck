import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate, ensureNotBanned } from "@/app/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult.userId;
    const role = authResult.role;
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
    const { id } = await params;
    const replyId = Number(id);
    if (!Number.isInteger(replyId)) {
      return NextResponse.json({ error: "Invalid reply id" }, { status: 400 });
    }

    const body = await req.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const existingReply = await prisma.reply.findUnique({
      where: { id: replyId },
      select: { id: true, authorId: true, content: true, version: true },
    });

    if (!existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    const isOwner = existingReply.authorId === userId;
    const isAdmin = role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Snapshot current content before overwriting
    await prisma.replyVersion.create({
      data: {
        replyId: existingReply.id,
        content: existingReply.content,
        version: existingReply.version,
      },
    });

    const reply = await prisma.reply.update({
      where: { id: replyId },
      data: {
        content: body.content,
        version: { increment: 1 },
      },
    });

    return NextResponse.json(reply);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 503 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const replyId = Number(id);
    if (!Number.isInteger(replyId)) {
      return NextResponse.json({ error: "Invalid reply id" }, { status: 400 });
    }

    const existingReply = await prisma.reply.findUnique({
      where: { id: replyId },
      select: { id: true, authorId: true },
    });

    if (!existingReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    const isOwner = existingReply.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.reply.delete({
      where: { id: replyId }
    });

    return NextResponse.json({ message: "Reply deleted" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 503 });
  }
}