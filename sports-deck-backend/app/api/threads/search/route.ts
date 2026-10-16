
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma, publicUserSelect } from "@/app/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get("title");
    const author = searchParams.get("author");
    const tag = searchParams.get("tag");
    const teamId = searchParams.get("teamId");
    const q = searchParams.get("q");

    const threads = await prisma.thread.findMany({
      where: {
        hidden: false,

        ...(q
          ? {
              OR: [
                {
                  title: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
                {
                  author: {
                    is: {
                      username: {
                        contains: q,
                        mode: "insensitive",
                      },
                    },
                  },
                },
                {
                  tags: {
                    some: {
                      tag: {
                        name: {
                          contains: q,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {}),

        ...(title && {
          title: {
            contains: title,
            mode: "insensitive",
          },
        }),

        ...(author && {
          author: {
            is: {
              username: {
                contains: author,
                mode: "insensitive",
              },
            },
          },
        }),

        ...(tag && {
          tags: {
            some: {
              tag: {
                name: {
                  contains: tag,
                  mode: "insensitive",
                },
              },
            },
          },
        }),

        ...(teamId && {
          teamId: Number(teamId),
        }),
      },

      include: {
        author: { select: publicUserSelect },
        tags: {
          include: {
            tag: true,
          },
        },
        posts: {
          where: {
            hidden: false,
          },
          include: {
            author: { select: publicUserSelect },
            replies: {
              include: {
                author: { select: publicUserSelect },
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(threads);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Search failed" }, { status: 503 });
  }
}