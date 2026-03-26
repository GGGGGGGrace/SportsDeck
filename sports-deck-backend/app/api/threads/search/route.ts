import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

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
                  },
                },
                {
                  author: {
                    is: {
                      username: {
                        contains: q,
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
          },
        }),

        ...(author && {
          author: {
            is: {
              username: {
                contains: author,
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
        author: true,
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
            author: true,
            replies: {
              include: {
                author: true,
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