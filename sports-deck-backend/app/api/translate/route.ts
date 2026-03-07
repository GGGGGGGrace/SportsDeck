import { NextResponse } from "next/server";
import { translateToEnglish } from "@/app/lib/huggingface";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const result = await translateToEnglish(body.text);

    return NextResponse.json({
      original: body.text,
      translation: result
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}