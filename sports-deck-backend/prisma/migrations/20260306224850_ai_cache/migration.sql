-- AlterTable
ALTER TABLE "Post" ADD COLUMN "translatedText" TEXT;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN "sentimentLabel" TEXT;
ALTER TABLE "Thread" ADD COLUMN "sentimentScore" REAL;

-- CreateTable
CREATE TABLE "Digest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
