import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { translateToEnglish } from "@/app/lib/huggingface";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reply = await prisma.reply.findUnique({
    where: { id: Number(id) },
  });

  if (!reply) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  // Return cached translation if available
  if (reply.translatedText) {
    return NextResponse.json({ translation: reply.translatedText, cached: true });
  }

  const ai = await translateToEnglish(reply.content);
  const translated = ai?.[0]?.translation_text ?? "";

  await prisma.reply.update({
    where: { id: reply.id },
    data: { translatedText: translated },
  });

  return NextResponse.json({ translation: translated, cached: false });
}
