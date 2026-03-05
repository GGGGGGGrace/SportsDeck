import { NextResponse } from "next/server";
import { getStandings, formatStandingResponse } from "@/app/lib/footballApi";

/**
 * GET /api/standings
 *
 * Returns the current Premier League standings/tables.
 */
export async function GET() {
  try {
    const data = await getStandings();

    const standings = data.standings.map((s) => ({
      stage: s.stage,
      type: s.type,
      group: s.group,
      table: s.table.map(formatStandingResponse),
    }));

    return NextResponse.json({
      competition: data.competition,
      season: data.season,
      standings,
    });
  } catch (error) {
    console.error("Error fetching standings:", error);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
