import { NextRequest, NextResponse } from "next/server";
import { authenticate, TokenPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * POST /api/users/[id]/follow
 * Follow a user (requires authentication)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const payload = authResult as TokenPayload;
  const { id: targetUserId } = await params;

  if (payload.userId === targetUserId) {
    return NextResponse.json(
      { error: "You cannot follow yourself" },
      { status: 400 }
    );
  }

  try {
    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: payload.userId,
          followingId: targetUserId,
        },
      },
    });
    if (existingFollow) {
      return NextResponse.json(
        { error: "You are already following this user" },
        { status: 409 }
      );
    }

    const follow = await prisma.follow.create({
      data: {
        followerId: payload.userId,
        followingId: targetUserId,
      },
    });

    return NextResponse.json(
      { message: "Successfully followed user", follow },
      { status: 201 }
    );
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 503 }
    );
  }
}

/**
 * DELETE /api/users/[id]/follow
 * Unfollow a user (requires authentication)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const payload = authResult as TokenPayload;
  const { id: targetUserId } = await params;

  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: payload.userId,
          followingId: targetUserId,
        },
      },
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: "You are not following this user" },
        { status: 404 }
      );
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: payload.userId,
          followingId: targetUserId,
        },
      },
    });

    return NextResponse.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: "Failed to unfollow user" },
      { status: 503 }
    );
  }
}
