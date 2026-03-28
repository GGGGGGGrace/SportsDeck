/*
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import Redis from 'ioredis';


const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

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
  competition: { id: number; name: string; code: string };
  season: { id: number; startDate: string; endDate: string; currentMatchday: number };
  teams: Array<{
    id: number;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
    venue: string | null;
  }>;
};

function getApiKey(): string {
  const apiKey = process.env.MATCH_API_KEY;
  if (!apiKey) throw new Error("MATCH_API_KEY is missing");
  return apiKey;
}

async function fetchFootballData<T>(path: string): Promise<T> {
  const response = await fetch(`${FOOTBALL_API_BASE}${path}`, {
    method: "GET",
    headers: { "X-Auth-Token": getApiKey() },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`API failed: ${response.status}`);
  return (await response.json()) as T;
}

async function main() {
  const competition = await fetchFootballData<CompetitionResponse>(`/competitions/${COMPETITION_CODE}`);
  const teamsResponse = await fetchFootballData<TeamsResponse>(`/competitions/${COMPETITION_CODE}/teams`);

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
      data: competition as any,
      expiresAt: new Date(Date.now() + thirtyDaysMs),
    },
    create: {
      key: `competition:${COMPETITION_CODE}`,
      data: competition as any,
      expiresAt: new Date(Date.now() + thirtyDaysMs),
    },
  });

  console.log(`Synced: ${syncedCount} teams.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
*/
import { syncTeams, getMatches, redis } from "../app/lib/footballApi";
import { prisma } from "../app/lib/prisma"; 

async function main() {
  console.log("Starting data sync...");
  await syncTeams(); 
  await getMatches();
  console.log("Data sync complete.");
}

main()
  .catch((error) => {
    console.error("Sync failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.quit();
  });
  