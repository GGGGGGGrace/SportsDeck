import { prisma } from "./prisma";

const FOOTBALL_API_BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "PL"; // Premier League

// Cache TTL in seconds
const CACHE_TTL = {
  IMMUTABLE: 30 * 24 * 60 * 60,  // 30 days
  SEMI_STATIC: 12 * 60 * 60,     // 12 hours
  DYNAMIC: 2 * 60 * 60,          // 2 hours
};
// GenAI usage: Claude Opus 4.5 (line 15 - 36)
// Prompt: "Implement a simple in-memory rate limiter 
// that allows up to 10 requests per minute. 
// If the limit is exceeded, it should delay 
// the request until a slot is available. 

class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests = 10;
  private windowMs = 60 * 1000; // 1 minute

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 100; // +100ms buffer
      console.log(`Rate limit: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

// GenAI usage: Claude Opus 4.5 (line 43 - 56)
// Prompt: "Implement a function that returns an 
// instance configured with the base URL of the football-data.org 
// API and includes the API key from an environment 
// variable in the headers."

function getApiKey(): string {
  const apiKey = process.env.MATCH_API_KEY;
  if (!apiKey) {
    throw new Error("MATCH_API_KEY environment variable is not set");
  }

  return apiKey;
}


async function getCached<T>(key: string): Promise<T | null> {
  try {
    const entry = await prisma.apiCache.findUnique({ where: { key } });
    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
      await prisma.apiCache.delete({ where: { key } }).catch(() => {});
      return null;
    }
    return JSON.parse(entry.data) as T;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const jsonData = JSON.stringify(data);

  try {
    await prisma.apiCache.upsert({
      where: { key },
      update: { data: jsonData, expiresAt },
      create: { key, data: jsonData, expiresAt },
    });
  } catch (e) {
    console.error("Cache write error:", e);
  }
}


async function fetchWithCache<T>(
  path: string,
  cacheKey: string,
  ttlSeconds: number
): Promise<T> {
  const cached = await getCached<T>(cacheKey);
  if (cached) return cached;

  await rateLimiter.waitForSlot();
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response: Response;
  try {
    response = await fetch(`${FOOTBALL_API_BASE}${path}`, {
      method: "GET",
      headers: {
        "X-Auth-Token": apiKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`football-data request failed: ${response.status}`);
  }

  const data = (await response.json()) as T;

  await setCache(cacheKey, data, ttlSeconds);

  return data;
}

// GenAI usage: Claude Opus 4.5 (line 114 - 205)
// Prompt: "Create interfaces for the football-data.org API 
// responses for matches, standings and competition info."

interface FdScore {
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

interface FdMatch {
  id: number;
  matchday: number;
  stage: string;
  utcDate: string;
  status: string; // SCHEDULED, TIMED, FINISHED, POSTPONED, CANCELLED
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: FdScore;
  venue?: string;
}

interface FdMatchesResponse {
  competition: { id: number; name: string; emblem: string };
  matches: FdMatch[];
  resultSet: {
    count: number;
    competitions: string;
    first: string;
    last: string;
    played: number;
  };
}

interface FdStandingEntry {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface FdStandingsResponse {
  competition: { id: number; name: string; emblem: string };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  standings: Array<{
    stage: string;
    type: string;
    table: FdStandingEntry[];
  }>;
}


interface FdCompetitionResponse {
  id: number;
  name: string;
  emblem: string;
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
}

export async function getCompetition(): Promise<FdCompetitionResponse> {
  return fetchWithCache<FdCompetitionResponse>(
    `/competitions/${COMPETITION_CODE}`,
    `competition:${COMPETITION_CODE}`,
    CACHE_TTL.IMMUTABLE
  );
}


export async function getMatches(filters?: {
  matchday?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<FdMatchesResponse> {
  const params = new URLSearchParams();
  if (filters?.matchday) params.set("matchday", String(filters.matchday));
  if (filters?.status) params.set("status", String(filters.status));
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);

  const query = params.toString();
  const path = `/competitions/${COMPETITION_CODE}/matches${query ? `?${query}` : ""}`;
  const cacheKey = `matches:${COMPETITION_CODE}:${query || "all"}`;

  const terminalStatuses = ["FINISHED", "CANCELLED", "AWARDED"];
  const ttl = filters?.status && terminalStatuses.includes(filters.status)
    ? CACHE_TTL.IMMUTABLE
    : CACHE_TTL.SEMI_STATIC;

  const data = await fetchWithCache<FdMatchesResponse>(path, cacheKey, ttl);

  await syncMatchesToDb(data.matches);

  return data;
}


export async function getMatch(matchId: number): Promise<FdMatch> {
  const cacheKey = `match:${matchId}`;

  const cached = await getCached<FdMatch>(cacheKey);
  if (cached) return cached;

  const allMatches = await getMatches();
  const match = allMatches.matches.find((m) => m.id === matchId);

  if (!match) {
    const err: any = new Error("Match not found");
    err.response = { status: 404 };
    throw err;
  }

  const terminalStatuses = ["FINISHED", "CANCELLED", "AWARDED"];
  const ttl = terminalStatuses.includes(match.status)
    ? CACHE_TTL.IMMUTABLE
    : CACHE_TTL.SEMI_STATIC;

  await setCache(cacheKey, match, ttl);

  return match;
}


export async function getStandings(): Promise<FdStandingsResponse> {
  return fetchWithCache<FdStandingsResponse>(
    `/competitions/${COMPETITION_CODE}/standings`,
    `standings:${COMPETITION_CODE}`,
    CACHE_TTL.DYNAMIC
  );
}


function formatScore(match: FdMatch): string | null {
  const ft = match.score?.fullTime;
  if (ft && ft.home !== null && ft.away !== null) {
    return `${ft.home}-${ft.away}`;
  }
  return null;
}

async function syncMatchesToDb(matches: FdMatch[]): Promise<void> {
  const adminUser = await prisma.user.findUnique({
    where: { username: "defaultadmin" }
  });

  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  for (const m of matches) {
    try {
      const match = await prisma.match.upsert({
        where: { externalId: m.id },
        update: {
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          homeTeamCrest: m.homeTeam.crest,
          awayTeamCrest: m.awayTeam.crest,
          homeScore: m.score?.fullTime?.home ?? null,
          awayScore: m.score?.fullTime?.away ?? null,
          score: formatScore(m),
          status: m.status,
          matchday: m.matchday,
          matchDate: new Date(m.utcDate),
          venue: m.venue ?? null,
          stage: m.stage ?? null,
        },
        create: {
          externalId: m.id,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          homeTeamCrest: m.homeTeam.crest,
          awayTeamCrest: m.awayTeam.crest,
          homeScore: m.score?.fullTime?.home ?? null,
          awayScore: m.score?.fullTime?.away ?? null,
          score: formatScore(m),
          status: m.status,
          matchday: m.matchday,
          matchDate: new Date(m.utcDate),
          venue: m.venue ?? null,
          stage: m.stage ?? null,
        },
      });
      
      const matchDate = new Date(m.utcDate);

      if (matchDate >= now && matchDate <= twoWeeksLater && adminUser) {
        const existingThread = await prisma.thread.findFirst({
          where: { matchId: match.id }
        });

        if (!existingThread) {
          await prisma.thread.create({
            data: {
              title: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
              matchId: match.id,
              authorId: adminUser.id,
            }
          });
        }
      }

    } catch (e) {
      console.error(`Failed to sync match ${m.id}:`, e);
    }
  }
}

// GenAI usage: Claude Opus 4.5 (line 347 - 397)
// Prompt: "Implement helper functions to format the raw API responses about 
// matches and standings into the shape expected by the frontend.

export function formatMatchResponse(m: FdMatch) {
  return {
    id: m.id,
    matchday: m.matchday,
    stage: m.stage,
    date: m.utcDate,
    status: m.status,
    venue: m.venue ?? null,
    homeTeam: {
      id: m.homeTeam.id,
      name: m.homeTeam.name,
      shortName: m.homeTeam.shortName,
      tla: m.homeTeam.tla,
      crest: m.homeTeam.crest,
    },
    awayTeam: {
      id: m.awayTeam.id,
      name: m.awayTeam.name,
      shortName: m.awayTeam.shortName,
      tla: m.awayTeam.tla,
      crest: m.awayTeam.crest,
    },
    score: {
      fullTime: m.score?.fullTime ?? null,
      halfTime: m.score?.halfTime ?? null,
    },
  };
}

export function formatStandingResponse(entry: FdStandingEntry) {
  return {
    position: entry.position,
    team: {
      id: entry.team.id,
      name: entry.team.name,
      shortName: entry.team.shortName,
      tla: entry.team.tla,
      crest: entry.team.crest,
    },
    playedGames: entry.playedGames,
    form: entry.form,
    won: entry.won,
    draw: entry.draw,
    lost: entry.lost,
    points: entry.points,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference,
  };
}
