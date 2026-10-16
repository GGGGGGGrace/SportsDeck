import { NextRequest, NextResponse } from "next/server";
import { authenticate, TokenPayload } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

interface FeedItem {
  type: "post" | "reply" | "match_update" | "team_thread";
  groupKey: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// For test url parameters needed: page, limit
/**
 * GET /api/users/feed
 * Personalized activity feed for the authenticated user.
 * Shows:
 *   1. Recent posts/comments on the user's own posts
 *   2. Posts and comments from users they follow
 *   3. Recent match score updates for their favorite team
 *   4. New threads in their favorite team's forum
 *
 * Groups related events to avoid overwhelming the user.
 */
export async function GET(request: NextRequest) {
  const authResult = authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const payload = authResult as TokenPayload;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));

    // only return 7 days results
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get current user's info and followed users
    const [currentUser, followedUsers] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, favoriteTeam: true },
      }),
      prisma.follow.findMany({
        where: { followerId: payload.userId },
        select: { followingId: true },
      }),
    ]);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const followedIds = followedUsers.map((f: { followingId: string }) => f.followingId);
    const feedItems: FeedItem[] = [];

    // 1. Replies to user's own posts
    const repliesToMyPosts = await prisma.reply.findMany({
      where: {
        createdAt: { gte: since },
        post: { authorId: payload.userId },
        authorId: { not: payload.userId }, // Exclude own replies
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        post: {
          select: {
            id: true,
            content: true,
            thread: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    //GenAI usage: Claude Opus 4.5 (line 83-95)
    // Prompt: "Given a way to save differnt types of feed items 
    // (posts, replies, match updates, team threads).

    for (const reply of repliesToMyPosts) {
      feedItems.push({
        type: "reply",
        groupKey: `reply-post-${reply.post.id}`,
        timestamp: reply.createdAt,
        data: {
          replyId: reply.id,
          content: reply.content,
          author: reply.author,
          post: reply.post,
        },
      });
    }

    // 2. Posts from followed users
    if (followedIds.length > 0) {
      const followedPosts = await prisma.post.findMany({
        where: {
          createdAt: { gte: since },
          authorId: { in: followedIds },
          hidden: false,
        },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          thread: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const post of followedPosts) {
        feedItems.push({
          type: "post",
          groupKey: `post-thread-${post.threadId}`,
          timestamp: post.createdAt,
          data: {
            postId: post.id,
            content: post.content,
            author: post.author,
            thread: post.thread,
          },
        });
      }

      // Replies from followed users
      const followedReplies = await prisma.reply.findMany({
        where: {
          createdAt: { gte: since },
          authorId: { in: followedIds },
        },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          post: {
            select: {
              id: true,
              content: true,
              thread: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const reply of followedReplies) {
        feedItems.push({
          type: "reply",
          groupKey: `reply-post-${reply.post.id}`,
          timestamp: reply.createdAt,
          data: {
            replyId: reply.id,
            content: reply.content,
            author: reply.author,
            post: reply.post,
          },
        });
      }
    }

    // 3. Favorite team match updates
    if (currentUser.favoriteTeam) {
      const teamName = currentUser.favoriteTeam;

      const recentMatches = await prisma.match.findMany({
        where: {
          updatedAt: { gte: since },
          OR: [
            { homeTeam: { contains: teamName } },
            { awayTeam: { contains: teamName } },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

      for (const match of recentMatches) {
        feedItems.push({
          type: "match_update",
          groupKey: `match-${match.id}`,
          timestamp: match.updatedAt,
          data: {
            matchId: match.id,
            externalId: match.externalId,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeTeamCrest: match.homeTeamCrest,
            awayTeamCrest: match.awayTeamCrest,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            score: match.score,
            status: match.status,
            matchDate: match.matchDate,
            venue: match.venue,
          },
        });
      }

      // 4. New threads in favorite team's forum
      // Look up team ID
      const team = await prisma.team.findFirst({
        where: {
          OR: [
            { name: { contains: teamName } },
            { shortName: teamName },
            { tla: teamName },
          ],
        },
      });

      if (team) {
        const teamThreads = await prisma.thread.findMany({
          where: {
            createdAt: { gte: since },
            teamId: team.id,
          },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            posts: { select: { id: true }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
        });

        for (const thread of teamThreads) {
          feedItems.push({
            type: "team_thread",
            groupKey: `team-thread-${thread.id}`,
            timestamp: thread.createdAt,
            data: {
              threadId: thread.id,
              title: thread.title,
              author: thread.author,
              postCount: thread.posts.length,
              teamId: team.id,
              teamName: team.name,
            },
          });
        }
      }
    }

    // GenAI usage: Claude Opus 4.5 (line 239 - 264)
    // Prompt: "Group the different items by their groupKey. 
    // For each group, keep track of the latest timestamp and 
    // count how many items are in that group. Sort the groups by 
    // latest timestamp descending.
    const groupMap = new Map<string, { type: string; groupKey: string; latestTimestamp: Date; count: number; latestItem: Record<string, unknown> }>();
    for (const item of feedItems) {
      const existing = groupMap.get(item.groupKey);
      if (existing) {
        existing.count++;
        if (item.timestamp > existing.latestTimestamp) {
          existing.latestTimestamp = item.timestamp;
          existing.latestItem = { ...item.data, timestamp: item.timestamp };
        }
      } else {
        groupMap.set(item.groupKey, {
          type: item.type,
          groupKey: item.groupKey,
          latestTimestamp: item.timestamp,
          count: 1,
          latestItem: { ...item.data, timestamp: item.timestamp },
        });
      }
    }

    const sortedGroups = Array.from(groupMap.values())
      .sort((a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime());

    // Page
    const total = sortedGroups.length;
    const start = (page - 1) * limit;
    const feed = sortedGroups.slice(start, start + limit);

    return NextResponse.json({
      feed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 503 }
    );
  }
}
