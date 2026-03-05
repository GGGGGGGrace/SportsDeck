import { NextRequest, NextResponse } from "next/server";
import { getMatch, formatMatchResponse } from "@/app/lib/footballApi";

/**
 * GET /api/matches/[id]
 *
 * Get details for a single match by its football-data.org ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);

    if (isNaN(matchId) || matchId <= 0) {
      return NextResponse.json(
        { error: "Invalid match ID" },
        { status: 400 }
      );
    }

    const match = await getMatch(matchId);
    return NextResponse.json(formatMatchResponse(match));
  } catch (error) {
    console.error("Error fetching match:", error);

    // Check for 404 from upstream
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response: { status: number } }).response?.status === 404
    ) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch match" },
      { status: 500 }
    );
  }
}
