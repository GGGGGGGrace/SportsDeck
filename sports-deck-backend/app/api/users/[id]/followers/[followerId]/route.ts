import { NextRequest, NextResponse } from "next/server";
import { authenticate, TokenPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * DELETE /api/users/[id]/followers/[followerId]
 * Remove one follower from the target user's followers list.
 *
 * For now, only the user themself can perform this action.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; followerId: string }> }
) {
  const authResult = authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const payload = authResult as TokenPayload;
  const { id: targetUserId, followerId } = await params;

  if (payload.userId !== targetUserId) {
    return NextResponse.json(
      { error: "You can only manage your own followers" },
      { status: 403 }
    );
  }

  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUserId,
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
          followerId,
          followingId: targetUserId,
        },
      },
    });

    return NextResponse.json({ message: "Follower removed successfully" });
  } catch (error) {
    console.error("Remove follower error:", error);
    return NextResponse.json(
      { error: "Failed to remove follower" },
      { status: 503 }
    );
  }
}
