import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export interface TokenPayload {
  userId: string;
  email: string;
  username?: string | null;
  role: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET || getSecret() + "_refresh";
  return secret;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "30m" });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
}

export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function authenticate(
  request: NextRequest
): TokenPayload | NextResponse {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return verifyAccessToken(token);
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

export async function ensureNotBanned(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true }
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.banned) {
    throw new Error("User is banned");
  }
}
