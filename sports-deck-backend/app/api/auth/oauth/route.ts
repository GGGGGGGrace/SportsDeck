import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { generateAccessToken, generateRefreshToken, TokenPayload } from "@/app/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { code, provider } = await request.json();

    if (!code || provider !== "github") {
      return NextResponse.json({ error: "Invalid provider or missing code" }, { status: 400 });
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userRes.json();

    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const emails = await emailRes.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email || emails[0]?.email;

    if (!primaryEmail) {
      return NextResponse.json({ error: "No email associated with this GitHub account" }, { status: 400 });
    }

    const dummyPassword = crypto.randomBytes(32).toString("hex"); // 生成随机防爆破密码
    
    const user = await prisma.user.upsert({
      where: { email: primaryEmail },
      update: { 
        avatarUrl: githubUser.avatar_url 
      },
      create: {
        email: primaryEmail,
        username: githubUser.login,
        password: dummyPassword, // 填入随机密码绕过 schema 限制
        avatarUrl: githubUser.avatar_url,
        role: "USER",
      },
    });

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username ?? undefined,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return NextResponse.json({
      message: "OAuth Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        favoriteTeam: user.favoriteTeam,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("OAuth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}