import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const poll = await prisma.poll.findUnique({
      where: { id: Number(id) },
      include: {
        options: {
          include: {
            votes: true
          }
        }
      }
    });

    return NextResponse.json(poll);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Poll fetch failed" }, { status: 503 });
  }
}