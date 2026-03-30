import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { prisma } from "@/app/lib/prisma";
import { authenticate, ensureNotBanned } from "@/app/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const postId = Number(id);
    if (!Number.isInteger(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = existingPost.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const post = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        content: body.content,
        version: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 503 });
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
    const postId = Number(id);
    if (!Number.isInteger(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = existingPost.authorId === authResult.userId;
    const isAdmin = authResult.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    await prisma.post.delete({
      where: { id: postId }
    });

    return NextResponse.json({ message: "Post deleted" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 503 });
  }
}

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
    const postId = Number(id);
    if (!Number.isInteger(postId)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const body = await req.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, content: true, version: true },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isOwner = existingPost.authorId === userId;
    const isAdmin = role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Snapshot current content before overwriting
    await prisma.postVersion.create({
      data: {
        postId: existingPost.id,
        content: existingPost.content,
        version: existingPost.version,
      },
    });

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        content: body.content,
        version: { increment: 1 },
      },
    });

    return NextResponse.json(post);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 503 }
    );
  }
}

