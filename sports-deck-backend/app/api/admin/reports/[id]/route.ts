import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const report = await prisma.report.update({
      where: { id: Number(id) },
      data: { status: body.status }
    });

    if (body.status === "APPROVED") {

      if (report.postId) {
        await prisma.post.update({
          where: { id: report.postId },
          data: { hidden: true }
        });
      }

      if (report.threadId) {
        await prisma.thread.update({
          where: { id: report.threadId },
          data: { hidden: true }
        });
      }
    }

    return NextResponse.json(report);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update report" },
        { status: 503 }
    );
  }
}