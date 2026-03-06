import { NextResponse } from "next/server";
import { getCompetition, getMatches } from "@/app/lib/footballApi";

/**
 * GET /api/matchdays
 *
 * matchdays or stages of the competition.
 */
export async function GET() {
  try {
    // Get competition info for current matchday
    const competition = await getCompetition();
    const currentMatchday = competition.currentSeason.currentMatchday;

    // Fetch matches to get unique available matchdays
    const allMatches = await getMatches();
    const matchdays = Array.from(new Set(allMatches.matches.map((m) => m.matchday)))
      .filter((m) => m !== null)
      .sort((a, b) => a - b);

    return NextResponse.json({
      competition: {
        id: competition.id,
        name: competition.name,
        emblem: competition.emblem,
      },
      currentMatchday,
      matchdays,
    });
  } catch (error) {
    console.error("Error fetching matchdays:", error);
    return NextResponse.json(
      { error: "Failed to fetch matchdays" },
      { status: 503 }
    );
  }
}
