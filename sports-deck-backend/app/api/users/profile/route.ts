import { NextRequest, NextResponse } from "next/server";
import { authenticate, TokenPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/users/profile
 * Get current user's profile (requires authentication)
 */
export async function GET(request: NextRequest) {
  const authResult = authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const payload = authResult as TokenPayload;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        favoriteTeam: true,
        role: true,
        banned: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 503 }
    );
  }
}

/**
 * PUT /api/users/profile
 * Update current user's profile (username, avatarUrl, favoriteTeam)
 */
export async function PUT(request: NextRequest) {
  const authResult = authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const payload = authResult as TokenPayload;

  try {
    const body = await request.json();
    const { username, avatarUrl, favoriteTeam } = body;

    // edit profile, only including my username, avatar and favorite team from the league
    const updateData: {
      username?: string;
      avatarUrl?: string;
      favoriteTeam?: string;
    } = {};

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length === 0) {
        return NextResponse.json(
          { error: "Username cannot be empty" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUser && existingUser.id !== payload.userId) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }

      updateData.username = username.trim();
    }

    if (avatarUrl !== undefined) {
      if (typeof avatarUrl !== "string") {
        return NextResponse.json(
          { error: "update failed" },
          { status: 400 }
        );
      }
      updateData.avatarUrl = avatarUrl;
    }

    if (favoriteTeam !== undefined) {
      if (typeof favoriteTeam !== "string") {
        return NextResponse.json(
          { error: "update failed" },
          { status: 400 }
        );
      }
      updateData.favoriteTeam = favoriteTeam;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        favoriteTeam: true,
        role: true,
        banned: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 503 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}
