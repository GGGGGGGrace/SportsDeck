import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const reply = await prisma.reply.update({
      where: { id: Number(id) },
      data: {
        content: body.content,
        version: { increment: 1 }
      }
    });

    return NextResponse.json(reply);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.reply.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: "Reply deleted" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}