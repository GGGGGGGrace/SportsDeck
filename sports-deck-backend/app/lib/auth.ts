import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

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

/**
 * Generate an access token (short-lived, 30 min)
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "30m" });
}

/**
 * Generate a refresh token (long-lived, 7 days)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: "7d" });
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret()) as TokenPayload;
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware-style helper: authenticate a request and return the payload.
 * Returns a NextResponse error if authentication fails, or the TokenPayload if successful.
 */
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

/**
 * Middleware-style helper: authenticate and require admin role.
 */
export function authenticateAdmin(
  request: NextRequest
): TokenPayload | NextResponse {
  const result = authenticate(request);
  if (result instanceof NextResponse) {
    return result;
  }

  if (result.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}
