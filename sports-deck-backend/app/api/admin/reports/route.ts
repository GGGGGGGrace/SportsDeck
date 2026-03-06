import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {

  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    include: {
      post: true,
      thread: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json(reports);
}