import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const post = await prisma.post.update({
      where: {
        id: Number(id),
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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.post.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: "Post deleted" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 503 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const post = await prisma.post.update({
      where: { id: Number(id) },
      data: {
        content: body.content,
        version: { increment: 1 }
      }
    });

    return NextResponse.json(post);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}

