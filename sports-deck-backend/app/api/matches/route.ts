import { NextRequest, NextResponse } from "next/server";
import { getMatches, formatMatchResponse } from "@/app/lib/footballApi";

/**
 * GET /api/matches
 *
 * Query params:
 *   - matchday: number — filter by matchday
 *   - status: string — filter by status (SCHEDULED, TIMED, FINISHED, POSTPONED, SUSPENDED, CANCELLED, AWARDED)
 *   - dateFrom: string (YYYY-MM-DD) — filter matches from this date
 *   - dateTo: string (YYYY-MM-DD) — filter matches until this date
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchday = searchParams.get("matchday");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const filters: {
      matchday?: number;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {};

    if (matchday) {
      const md = parseInt(matchday, 10);
      if (isNaN(md) || md < 1 || md > 38) {
        return NextResponse.json(
          { error: "matchday must be a number between 1 and 38" },
          { status: 400 }
        );
      }
      filters.matchday = md;
    }

    if (status) {
      const validStatuses = [
        "SCHEDULED", "TIMED", "FINISHED", "POSTPONED", "CANCELLED", "AWARDED"
      ];
      const upper = status.toUpperCase();
      if (!validStatuses.includes(upper)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      filters.status = upper;
    }

    if (dateFrom) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        return NextResponse.json(
          { error: "dateFrom must be in YYYY-MM-DD format" },
          { status: 400 }
        );
      }
      filters.dateFrom = dateFrom;
    }

    if (dateTo) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        return NextResponse.json(
          { error: "dateTo must be in YYYY-MM-DD format" },
          { status: 400 }
        );
      }
      filters.dateTo = dateTo;
    }

    const data = await getMatches(filters);

    return NextResponse.json({
      competition: data.competition,
      resultSet: data.resultSet,
      matches: data.matches.map(formatMatchResponse),
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
