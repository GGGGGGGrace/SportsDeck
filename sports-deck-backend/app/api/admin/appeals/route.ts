import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  if (authResult.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appeals = await prisma.appeal.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  const enriched = await Promise.all(
    appeals.map(async (appeal) => {
      const user = await prisma.user.findUnique({
        where: { id: appeal.userId },
        select: { id: true, username: true, email: true, banned: true },
      });
      return { ...appeal, user };
    })
  );

  return NextResponse.json(enriched);
}
