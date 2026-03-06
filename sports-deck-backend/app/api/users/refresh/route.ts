import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  TokenPayload,
} from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    let payload: TokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    const newTokenPayload: TokenPayload = {
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };

    const newAccessToken = generateAccessToken(newTokenPayload);
    const newRefreshToken = generateRefreshToken(newTokenPayload);

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 503 }
    );
  }
}
