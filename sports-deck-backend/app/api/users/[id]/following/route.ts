import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/users/[id]/following
 * List users this user is following, sorted by follow time (most recent first).
 * Supports pagination via ?page=1&limit=20
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          following: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              favoriteTeam: true,
            },
          },
        },
      }),
      prisma.follow.count({ where: { followerId: id } }),
    ]);

    return NextResponse.json({
      following: following.map((f: { following: { id: string; username: string | null; avatarUrl: string | null; favoriteTeam: string | null }; createdAt: Date }) => ({
        ...f.following,
        followedAt: f.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Fetch following error:", error);
    return NextResponse.json(
      { error: "Failed to fetch following" },
      { status: 503 }
    );
  }
}
