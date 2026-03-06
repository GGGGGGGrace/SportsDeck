import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (typeof body.banned !== "boolean") {
      return NextResponse.json(
        { error: "banned must be true or false" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { banned: body.banned }
    });

    return NextResponse.json(user);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}