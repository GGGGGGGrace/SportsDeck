import axios, { AxiosInstance } from "axios";
import { prisma } from "./prisma";

const FOOTBALL_API_BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "PL"; // Premier League

// Cache TTL in seconds
const CACHE_TTL = {
  IMMUTABLE: 30 * 24 * 60 * 60,  // 30 days: teams, competition structure, finished matches
  SEMI_STATIC: 12 * 60 * 60,     // 12 hours: scheduled fixtures (rarely change)
  DYNAMIC: 2 * 60 * 60,          // 2 hours: standings (updated after daily results)
};

// constraint for rate limiting: max 10 requests per minute to football-data.org
// TODO cite
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

// Create an Axios instance with the API key header
function getApiClient(): AxiosInstance {
  const apiKey = process.env.MATCH_API_KEY;
  if (!apiKey) {
    throw new Error("MATCH_API_KEY environment variable is not set");
  }

  return axios.create({
    baseURL: FOOTBALL_API_BASE,
    headers: {
      "X-Auth-Token": apiKey,
    },
    timeout: 10000,
  });
}

// ─── Cache helpers ──────────────────────────────────────────────────────────

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const entry = await prisma.apiCache.findUnique({ where: { key } });
    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
      // Expired — delete and return null
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

// ─── API wrappers ───────────────────────────────────────────────────────────

/**
 * Fetch from football-data.org with cache + rate limiting. (cite)
 */
async function fetchWithCache<T>(
  path: string,
  cacheKey: string,
  ttlSeconds: number
): Promise<T> {
  // Check cache first
  const cached = await getCached<T>(cacheKey);
  if (cached) return cached;

  // Rate limit then fetch
  await rateLimiter.waitForSlot();
  const client = getApiClient();
  const response = await client.get<T>(path);
  const data = response.data;

  // Cache the response
  await setCache(cacheKey, data, ttlSeconds);

  return data;
}

// ─── Football-data.org typed responses ──────────────────────────────────────

interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  venue?: string;
}

interface FdScore {
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

interface FdMatch {
  id: number;
  matchday: number;
  stage: string;
  group: string | null;
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
    group: string | null;
    table: FdStandingEntry[];
  }>;
}

interface FdTeamsResponse {
  competition: { id: number; name: string; emblem: string };
  season: { id: number; currentMatchday: number };
  teams: FdTeam[];
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
    stages: string[];
  };
  seasons: Array<{
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  }>;
}

// ─── Public API functions ───────────────────────────────────────────────────

/**
 * Get competition info (includes currentMatchday).
 */
export async function getCompetition(): Promise<FdCompetitionResponse> {
  return fetchWithCache<FdCompetitionResponse>(
    `/competitions/${COMPETITION_CODE}`,
    `competition:${COMPETITION_CODE}`,
    CACHE_TTL.IMMUTABLE
  );
}

/**
 * Get all teams in the competition.
 */
export async function getTeams(): Promise<FdTeamsResponse> {
  const data = await fetchWithCache<FdTeamsResponse>(
    `/competitions/${COMPETITION_CODE}/teams`,
    `teams:${COMPETITION_CODE}`,
    CACHE_TTL.IMMUTABLE
  );

  // Sync teams to local DB for reference
  for (const team of data.teams) {
    try {
      await prisma.team.upsert({
        where: { id: team.id },
        update: {
          name: team.name,
          shortName: team.shortName,
          tla: team.tla,
          crest: team.crest,
          venue: team.venue ?? null,
        },
        create: {
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          tla: team.tla,
          crest: team.crest,
          venue: team.venue ?? null,
        },
      });
    } catch (e) {
      console.error(`Failed to sync team ${team.name}:`, e);
    }
  }

  return data;
}

/**
 * Get matches — optionally filtered by matchday or status.
 */
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

  // Terminal statuses are immutable (result won't change); others refresh periodically
  const terminalStatuses = ["FINISHED", "CANCELLED", "AWARDED"];
  const ttl = filters?.status && terminalStatuses.includes(filters.status)
    ? CACHE_TTL.IMMUTABLE
    : CACHE_TTL.SEMI_STATIC;

  const data = await fetchWithCache<FdMatchesResponse>(path, cacheKey, ttl);

  // Sync matches to local DB (for thread associations)
  await syncMatchesToDb(data.matches);

  return data;
}

/**
 * Get a single match by its football-data.org ID.
 */
export async function getMatch(matchId: number): Promise<FdMatch> {
  const cacheKey = `match:${matchId}`;

  // Check per-match cache first
  const cached = await getCached<FdMatch>(cacheKey);
  if (cached) return cached;

  // Fetch all matches for the competition (this endpoint is free-tier safe)
  const allMatches = await getMatches();
  const match = allMatches.matches.find((m) => m.id === matchId);

  if (!match) {
    const err: any = new Error("Match not found");
    err.response = { status: 404 };
    throw err;
  }

  // Cache the individual match
  const terminalStatuses = ["FINISHED", "CANCELLED", "AWARDED"];
  const ttl = terminalStatuses.includes(match.status)
    ? CACHE_TTL.IMMUTABLE
    : CACHE_TTL.SEMI_STATIC;

  await setCache(cacheKey, match, ttl);

  return match;
}

/**
 * Get league standings.
 */
export async function getStandings(): Promise<FdStandingsResponse> {
  return fetchWithCache<FdStandingsResponse>(
    `/competitions/${COMPETITION_CODE}/standings`,
    `standings:${COMPETITION_CODE}`,
    CACHE_TTL.DYNAMIC
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
          group: m.group ?? null,
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
          group: m.group ?? null,
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
      console.error("Failed to sync match");
    }
  }
}

// ─── Response formatters (for API routes) ───────────────────────────────────

export function formatMatchResponse(m: FdMatch) {
  return {
    id: m.id,
    matchday: m.matchday,
    stage: m.stage,
    group: m.group,
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
