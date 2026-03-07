import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const FOOTBALL_API_BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "PL";

type CompetitionResponse = {
  id: number;
  name: string;
  emblem: string | null;
  currentSeason: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  seasons: Array<{
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  }>;
};

type TeamsResponse = {
  competition: {
    id: number;
    name: string;
    code: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  teams: Array<{
    id: number;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
    venue: string | null;
  }>;
};

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new (PrismaClient as any)({ adapter });

function getApiKey(): string {
  const apiKey = process.env.MATCH_API_KEY;
  if (!apiKey) {
    throw new Error("MATCH_API_KEY environment variable is not set");
  }
  return apiKey;
}

async function fetchFootballData<T>(path: string): Promise<T> {
  const response = await fetch(`${FOOTBALL_API_BASE}${path}`, {
    method: "GET",
    headers: {
      "X-Auth-Token": getApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`football-data request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function main() {
  const competition = await fetchFootballData<CompetitionResponse>(
    `/competitions/${COMPETITION_CODE}`
  );
  const teamsResponse = await fetchFootballData<TeamsResponse>(
    `/competitions/${COMPETITION_CODE}/teams`
  );

  let syncedCount = 0;

  for (const team of teamsResponse.teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: {
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        crest: team.crest,
        venue: team.venue,
      },
      create: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        tla: team.tla,
        crest: team.crest,
        venue: team.venue,
      },
    });
    syncedCount += 1;
  }

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  await prisma.apiCache.upsert({
    where: { key: `competition:${COMPETITION_CODE}` },
    update: {
      data: JSON.stringify(competition),
      expiresAt: new Date(Date.now() + thirtyDaysMs),
    },
    create: {
      key: `competition:${COMPETITION_CODE}`,
      data: JSON.stringify(competition),
      expiresAt: new Date(Date.now() + thirtyDaysMs),
    },
  });

  console.log(
    `Football data synced successfully: ${syncedCount} teams and competition metadata`
  );
}

main()
  .catch((error) => {
    console.error("football data sync failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
