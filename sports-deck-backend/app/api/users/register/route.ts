import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/app/lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  TokenPayload,
} from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const username =
      typeof body.username === "string" && body.username.trim()
        ? body.username.trim()
        : null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        role: "USER",
      },
    });

    // Generate tokens for the new user
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 503 }
    );
  }
}
