import { NextRequest, NextResponse } from "next/server";
import { getMatches, formatMatchResponse } from "@/app/lib/footballApi";

export const dynamic = 'force-dynamic';

/**
 * GET /api/matchdays/[matchday]
 *
 * Returns all matches for a specific matchday.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchday: string }> }
) {
  try {
    const { matchday } = await params;
    const md = parseInt(matchday, 10);

    if (isNaN(md) || md < 1 || md > 38) {
      return NextResponse.json(
        { error: "matchday must be a number between 1 and 38" },
        { status: 400 }
      );
    }

    const data = await getMatches({ matchday: md });

    return NextResponse.json({
      matchday: md,
      competition: data.competition,
      matches: data.matches.map(formatMatchResponse),
    });
  } catch (error) {
    console.error(`Error fetching matchday:`, error);
    return NextResponse.json(
      { error: "Failed to fetch matchday data" },
      { status: 503 }
    );
  }
}
