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

    if (!poll) {
      return NextResponse.json(
        { error: "Poll not found" },
        { status: 404 }
      );
    }

    const results = poll.options.map((option: any) => ({
        optionId: option.id,
        text: option.text,
        votes: option.votes.length
    }));

    return NextResponse.json({
      pollId: poll.id,
      question: poll.question,
      deadline: poll.deadline,
      results
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch poll results" },
      { status: 503 }
    );
  }
}