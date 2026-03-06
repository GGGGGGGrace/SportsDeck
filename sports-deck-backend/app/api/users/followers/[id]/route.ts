import { NextRequest, NextResponse } from "next/server";
import { authenticate, TokenPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * DELETE /api/users/followers/[id]
 * Remove a follower (the user with [id]) from your followers list.
 * Requires authentication. Only removes if [id] is currently following you.
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
  const { id: followerUserId } = await params;

  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerUserId,
          followingId: payload.userId,
        },
      },
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: "This user is not following you" },
        { status: 404 }
      );
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: followerUserId,
          followingId: payload.userId,
        },
      },
    });

    return NextResponse.json({ message: "Follower removed successfully" });
  } catch (error) {
    console.error("Remove follower error:", error);
    return NextResponse.json(
      { error: "Failed to remove follower" },
      { status: 500 }
    );
  }
}
