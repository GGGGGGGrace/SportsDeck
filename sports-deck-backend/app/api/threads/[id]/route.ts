import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const threadId = Number(id);
    if (!Number.isInteger(threadId)) {
      return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const existingThread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, authorId: true },
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const isOwner = existingThread.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: {
        title: body.title
      }
    });

    return NextResponse.json(thread);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const threadId = Number(id);
    if (!Number.isInteger(threadId)) {
      return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
    }

    const thread = await prisma.thread.findUnique({
      where: {
        id: threadId,
      },
      include: {
        author: true,
        posts: {
          where: { hidden: false },
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
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 503 });
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
    const threadId = Number(id);
    if (!Number.isInteger(threadId)) {
      return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
    }

    const existingThread = await prisma.thread.findUnique({
      where: { id: threadId },
      select: { id: true, authorId: true },
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const isOwner = existingThread.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.thread.delete({
      where: { id: threadId }
    });

    return NextResponse.json({ message: "Thread deleted" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 503 });
  }
}