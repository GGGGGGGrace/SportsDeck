import { NextResponse } from "next/server";
import { getMatches, getCompetition, formatMatchResponse } from "@/app/lib/footballApi";

/**
 * GET /api/matchdays
 *
 * Returns a summary of all matchdays in the competition,
 * indicating their status (completed, in progress, or upcoming)
 * and the current matchday.
 */
export async function GET() {
  try {
    // Get competition info for current matchday
    const competition = await getCompetition();
    const currentMatchday = competition.currentSeason.currentMatchday;

    // Fetch all matches to build matchday summaries
    const allMatches = await getMatches();

    // Group matches by matchday
    const matchdayMap = new Map<
      number,
      {
        matchday: number;
        matches: ReturnType<typeof formatMatchResponse>[];
        startDate: string | null;
        endDate: string | null;
        finishedCount: number;
        totalCount: number;
      }
    >();

    for (const m of allMatches.matches) {
      const md = m.matchday;
      if (!matchdayMap.has(md)) {
        matchdayMap.set(md, {
          matchday: md,
          matches: [],
          startDate: null,
          endDate: null,
          finishedCount: 0,
          totalCount: 0,
        });
      }

      const entry = matchdayMap.get(md)!;
      entry.totalCount++;
      if (m.status === "FINISHED" || m.status === "CANCELLED" || m.status === "AWARDED") {
        entry.finishedCount++;
      }

      const matchDate = m.utcDate;
      if (!entry.startDate || matchDate < entry.startDate) {
        entry.startDate = matchDate;
      }
      if (!entry.endDate || matchDate > entry.endDate) {
        entry.endDate = matchDate;
      }
    }

    // Build the summary list
    const matchdays = Array.from(matchdayMap.values())
      .sort((a, b) => a.matchday - b.matchday)
      .map((md) => {
        let status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING";
        if (md.finishedCount === md.totalCount && md.totalCount > 0) {
          status = "COMPLETED";
        } else if (md.finishedCount > 0) {
          status = "IN_PROGRESS";
        } else {
          status = "UPCOMING";
        }

        return {
          matchday: md.matchday,
          status,
          startDate: md.startDate,
          endDate: md.endDate,
          finishedCount: md.finishedCount,
          totalCount: md.totalCount,
        };
      });

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
      { status: 500 }
    );
  }
}
