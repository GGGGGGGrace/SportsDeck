import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { analyzeSentiment } from "@/app/lib/huggingface";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;

  const thread = await prisma.thread.findUnique({
    where: { id: Number(id) },
    include: {
      posts: {
        where: { hidden: false }
      }
    }
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // CACHE CHECK
  if (thread.sentimentLabel) {
    return NextResponse.json({
      label: thread.sentimentLabel,
      score: thread.sentimentScore,
      cached: true
    });
  }

  const text = thread.posts.map((p: any) => p.content).join("\n");

  const ai = await analyzeSentiment(text);

  const top = Array.isArray(ai?.[0]) ? ai[0][0] : ai?.[0];

  await prisma.thread.update({
    where: { id: thread.id },
    data: {
      sentimentLabel: top.label,
      sentimentScore: top.score
    }
  });

  return NextResponse.json({
    label: top.label,
    score: top.score,
    cached: false
  });

}