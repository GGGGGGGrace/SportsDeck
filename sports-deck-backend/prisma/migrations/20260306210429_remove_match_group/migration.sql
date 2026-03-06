/*
  Warnings:

  - You are about to drop the column `group` on the `Match` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" INTEGER NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeTeamCrest" TEXT,
    "awayTeamCrest" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "score" TEXT,
    "status" TEXT NOT NULL,
    "matchday" INTEGER NOT NULL DEFAULT 0,
    "matchDate" DATETIME NOT NULL,
    "venue" TEXT,
    "stage" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Match" ("awayScore", "awayTeam", "awayTeamCrest", "externalId", "homeScore", "homeTeam", "homeTeamCrest", "id", "matchDate", "matchday", "score", "stage", "status", "updatedAt", "venue") SELECT "awayScore", "awayTeam", "awayTeamCrest", "externalId", "homeScore", "homeTeam", "homeTeamCrest", "id", "matchDate", "matchday", "score", "stage", "status", "updatedAt", "venue" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
