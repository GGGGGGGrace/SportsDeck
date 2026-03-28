/*
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = new (PrismaClient as any)({ adapter });
*/
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

export const prisma = new PrismaClient({ adapter });

