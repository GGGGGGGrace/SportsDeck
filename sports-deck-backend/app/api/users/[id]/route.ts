import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[id]
 * Public user profile page: includes user info, follower/following counts,
 * favorite team, and lists of threads, posts, and replies.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        favoriteTeam: true,
        createdAt: true,
        threads: {
          orderBy: { createdAt: "desc" },
          include: {
            posts: { select: { id: true } },
            tags: { include: { tag: true } },
          },
        },
        posts: {
          orderBy: { createdAt: "desc" },
          include: {
            thread: { select: { id: true, title: true } },
            replies: { select: { id: true } },
          },
        },
        replies: {
          orderBy: { createdAt: "desc" },
          include: {
            post: {
              select: {
                id: true,
                thread: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count followers and following
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
    ]);

    return NextResponse.json({
      ...user,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    return NextResponse.json(
          { error: "Failed to fetch user profile" },
          { status: 503 }
    );
  }
}
