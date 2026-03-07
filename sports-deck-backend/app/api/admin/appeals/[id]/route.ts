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
    if (authResult.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const appealId = Number(id);
    if (!Number.isInteger(appealId)) {
      return NextResponse.json({ error: "Invalid appeal id" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.status || typeof body.status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const existingAppeal = await prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!existingAppeal) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
    }

    const appeal = await prisma.appeal.update({
      where: { id: appealId },
      data: { status: body.status }
    });

    if (body.status === "APPROVED") {
      await prisma.user.update({
        where: { id: appeal.userId },
        data: { banned: false }
      });
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update appeal" }, { status: 503 });
  }
}