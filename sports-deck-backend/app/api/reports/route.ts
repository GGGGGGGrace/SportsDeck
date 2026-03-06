import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const report = await prisma.report.create({
      data: {
        reporterId: body.userId,
        reason: body.reason,
        postId: body.postId ?? null,
        threadId: body.threadId ?? null
      }
    });

    return NextResponse.json(report);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Report failed" },
      { status: 500 }
    );
  }
}