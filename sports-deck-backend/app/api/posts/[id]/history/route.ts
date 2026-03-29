import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/posts/[id]/history
 * Returns all saved versions of a post, oldest first.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const versions = await prisma.postVersion.findMany({
    where: { postId: Number(id) },
    orderBy: { version: "asc" },
  });

  return NextResponse.json(versions);
}
