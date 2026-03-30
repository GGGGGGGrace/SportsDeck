import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { extractBearerToken, verifyAccessToken } from "@/app/lib/auth";
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[id]
 * Public user profile page: includes user info, follower/following counts,
 * favorite team, and lists of threads, posts, and replies.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        favoriteTeam: true,
        createdAt: true,
        threads: {
          where: { hidden: false },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, createdAt: true },
        },
        posts: {
          where: { hidden: false },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            thread: { select: { id: true, title: true } },
          },
        },
        replies: {
          orderBy: { createdAt: "desc" },
          select: { id: true, content: true, createdAt: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Accurate counts via dedicated queries (avoids hidden-post skew)
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
    ]);

    // Optionally determine isFollowing for the logged-in viewer
    let isFollowing = false;
    try {
      const token = extractBearerToken(request);
      if (token) {
        const payload = verifyAccessToken(token);
        if (payload.userId !== id) {
          const follow = await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: payload.userId,
                followingId: id,
              },
            },
          });
          isFollowing = !!follow;
        }
      }
    } catch {
      // unauthenticated visitor — isFollowing stays false
    }

    return NextResponse.json({
      ...user,
      isFollowing,
      _count: {
        threads: user.threads.length,
        posts: user.posts.length,
        replies: user.replies.length,
        followers: followersCount,
        following: followingCount,
      },
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 503 }
    );
  }
}
