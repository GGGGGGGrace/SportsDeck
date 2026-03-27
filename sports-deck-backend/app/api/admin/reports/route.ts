import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  if (authResult.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    include: {
      post: true,
      thread: true
    },
    orderBy: [
      { aiScore: "desc" },
      { createdAt: "desc" }
    ]
  });

  return NextResponse.json(reports);
}