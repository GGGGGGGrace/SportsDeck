import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/replies/[id]/history
 * Returns all saved versions of a reply, oldest first.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reply = await prisma.reply.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!reply) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  const versions = await prisma.replyVersion.findMany({
    where: { replyId: Number(id) },
    orderBy: { version: "asc" },
  });

  return NextResponse.json(versions);
}
