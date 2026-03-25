import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { authenticate } from "@/app/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) return authResult;
    if (authResult.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const reportId = Number(id);
    if (!Number.isInteger(reportId)) {
      return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
    }

    const body = await req.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await prisma.report.update({
      where: { id: reportId },
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id: Number(id) },
    include: {
      post: {
        include: {
          author: true,
          thread: true
        }
      },
      thread: true
    }
  });

  if (!report) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    reportId: report.id,
    reason: report.reason,
    status: report.status,

    content: report.post?.content,
    threadTitle: report.post?.thread?.title,

    aiVerdict: {
      label: report.post?.aiModerationLabel,
      score: report.post?.aiModerationScore,
      explanation: report.post?.aiModerationReason
    }
  });
}