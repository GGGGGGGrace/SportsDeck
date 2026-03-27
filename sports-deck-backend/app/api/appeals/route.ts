import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  if (!body.reason || typeof body.reason !== "string") {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const appeal = await prisma.appeal.create({
    data: {
      userId: authResult.userId,
      reason: body.reason
    }
  });

  return NextResponse.json(appeal);
}