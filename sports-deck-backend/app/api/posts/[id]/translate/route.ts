import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { translateToEnglish } from "@/app/lib/huggingface";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id: Number(id) }
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.translatedText) {
    return NextResponse.json({
      translation: post.translatedText,
      cached: true
    });
  }

  const ai = await translateToEnglish(post.content);

  const translated = ai?.[0]?.translation_text ?? "";

  await prisma.post.update({
    where: { id: post.id },
    data: {
      translatedText: translated
    }
  });

  return NextResponse.json({
    translation: translated,
    cached: false
  });

}