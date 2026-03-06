import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {

  const body = await req.json();

  const appeal = await prisma.appeal.create({
    data: {
      userId: body.userId,
      reason: body.reason
    }
  });

  return NextResponse.json(appeal);
}