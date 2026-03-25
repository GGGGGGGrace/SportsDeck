/*
  Warnings:

  - You are about to drop the column `aiModerationReason` on the `Post` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "threadId" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "aiModerationLabel" TEXT,
    "aiModerationScore" REAL,
    "translatedText" TEXT,
    CONSTRAINT "Post_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("aiModerationLabel", "aiModerationScore", "authorId", "content", "createdAt", "hidden", "id", "threadId", "translatedText", "updatedAt", "version") SELECT "aiModerationLabel", "aiModerationScore", "authorId", "content", "createdAt", "hidden", "id", "threadId", "translatedText", "updatedAt", "version" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
