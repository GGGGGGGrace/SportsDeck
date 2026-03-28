
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { summarizeText } from "@/app/lib/huggingface";

export async function GET() {

  const latestDigest = await prisma.digest.findFirst({
    orderBy: { createdAt: "desc" }
  });

  const today = new Date();

  if (
    latestDigest &&
    today.getTime() - latestDigest.createdAt.getTime() < 86400000
  ) {
    return NextResponse.json({
      content: latestDigest.content,
      cached: true
    });
  }

  const threads = await prisma.thread.findMany({
    where: { hidden: false },
    include: { posts: true },
    take: 5
  });

  const text = threads
  .map((t: any) => `${t.title}: ${t.posts.map((p: any) => p.content).join(" ")}`)
  .join("\n");

  const ai = await summarizeText(text);

  const summary =
    ai?.[0]?.summary_text ??
    ai?.summary_text ??
    text.slice(0, 500);

  await prisma.digest.create({
    data: { content: summary }
  });

  return NextResponse.json({
    content: summary,
    cached: false
  });

}