import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const thread = await prisma.thread.update({
      where: { id: Number(id) },
      data: {
        title: body.title
      }
    });

    return NextResponse.json(thread);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const thread = await prisma.thread.findUnique({
      where: {
        id: Number(id),
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
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.thread.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: "Thread deleted" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}