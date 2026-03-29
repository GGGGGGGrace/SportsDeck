-- Migration: add per-team sentiment columns to Thread and translatedText to Reply

ALTER TABLE "Thread" ADD COLUMN "homeTeamSentimentLabel" TEXT;
ALTER TABLE "Thread" ADD COLUMN "homeTeamSentimentScore" DOUBLE PRECISION;
ALTER TABLE "Thread" ADD COLUMN "awayTeamSentimentLabel" TEXT;
ALTER TABLE "Thread" ADD COLUMN "awayTeamSentimentScore" DOUBLE PRECISION;

ALTER TABLE "Reply" ADD COLUMN "translatedText" TEXT;
