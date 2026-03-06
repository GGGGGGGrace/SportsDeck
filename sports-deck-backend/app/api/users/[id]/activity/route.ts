import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

/**
 * GET /api/users/[id]/activity
 * Activity chart data for a user over a period of time.
 * Query params (both required):
 *   - dateFrom: ISO date string (e.g. "2026-01-01")
 *   - dateTo:   ISO date string (e.g. "2026-03-05")
 *
 * Returns an array of { date, posts, replies, total } daily buckets.
 *
 * As a visitor,
 * I want to see the activity chart of a user over a certain period of
 * time. Activity is determined based on the number of posts and comments
 * authored by the user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

    if (!dateFromParam || !dateToParam) {
      return NextResponse.json(
        { error: "Invalid search" },
        { status: 400 }
      );
    }

    const dateFrom = new Date(dateFromParam);
    const dateTo = new Date(dateToParam);

    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
      return NextResponse.json(
        { error: "Invalid search" },
        { status: 400 }
      );
    }

    if (dateFrom > dateTo) {
      return NextResponse.json(
        { error: "Invalid time range" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Normalize to start/end of day
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    // Fetch all posts and replies in the period
    const [posts, replies] = await Promise.all([
      prisma.post.findMany({
        where: {
          authorId: id,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { createdAt: true },
      }),
      prisma.reply.findMany({
        where: {
          authorId: id,
          createdAt: { gte: dateFrom, lte: dateTo },
        },
        select: { createdAt: true },
      }),
    ]);

    // Build daily buckets
    const buckets = new Map<string, { posts: number; replies: number }>();

    // Initialize all day buckets so there are no gaps in the chart
    const current = new Date(dateFrom);
    const end = new Date(dateTo);
    while (current <= end) {
      const key = current.toISOString().split("T")[0];
      buckets.set(key, { posts: 0, replies: 0 });
      current.setDate(current.getDate() + 1);
    }

    for (const post of posts) {
      const key = new Date(post.createdAt).toISOString().split("T")[0];
      const bucket = buckets.get(key);
      if (bucket) bucket.posts++;
    }

    for (const reply of replies) {
      const key = new Date(reply.createdAt).toISOString().split("T")[0];
      const bucket = buckets.get(key);
      if (bucket) bucket.replies++;
    }

    const activity = [];

    const sortedDates = Array.from(buckets.keys()).sort();

    for (const date of sortedDates) {
        const data = buckets.get(date);
        if (!data) continue;

        const item = {
            date: date,
            posts: data.posts,
            replies: data.replies,
            total: data.posts + data.replies
        };

        activity.push(item);
    }

    return NextResponse.json({
      userId: id,
      dateFrom: dateFromParam,
      dateTo: dateToParam,
      activity,
    });
  } catch (error) {
    console.error("Activity chart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity data" },
      { status: 500 }
    );
  }
}
