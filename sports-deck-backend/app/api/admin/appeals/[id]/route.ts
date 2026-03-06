import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const appeal = await prisma.appeal.update({
    where: { id: Number(id) },
    data: { status: body.status }
  });

  if (body.status === "APPROVED") {
    await prisma.user.update({
      where: { id: appeal.userId },
      data: { banned: false }
    });
  }

  return NextResponse.json(appeal);
}