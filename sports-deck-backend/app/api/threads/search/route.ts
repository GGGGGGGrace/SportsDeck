import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title");
    const author = searchParams.get("author");
    const tag = searchParams.get("tag");
    const teamId = searchParams.get("teamId");

    const threads = await prisma.thread.findMany({
      where: {
        hidden: false,
        title: title
          ? { contains: title }
          : undefined,

        author: author
          ? {
              email: {
                contains: author
              }
            }
          : undefined,

        teamId: teamId ? Number(teamId) : undefined,

        tags: tag
          ? {
              some: {
                tag: {
                  name: tag
                }
              }
            }
          : undefined
      },
      include: {
        author: true,
        tags: true,
        posts: {
          where: {
            hidden: false
          },
          include: {
            replies: true
          }
        }
      }
    });

    return NextResponse.json(threads);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}