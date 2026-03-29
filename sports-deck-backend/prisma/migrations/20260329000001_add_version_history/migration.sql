-- Migration: add PostVersion and ReplyVersion tables for edit history

CREATE TABLE "PostVersion" (
  "id"        SERIAL          NOT NULL PRIMARY KEY,
  "postId"    INTEGER         NOT NULL,
  "content"   TEXT            NOT NULL,
  "version"   INTEGER         NOT NULL,
  "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostVersion_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReplyVersion" (
  "id"        SERIAL          NOT NULL PRIMARY KEY,
  "replyId"   INTEGER         NOT NULL,
  "content"   TEXT            NOT NULL,
  "version"   INTEGER         NOT NULL,
  "createdAt" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReplyVersion_replyId_fkey"
    FOREIGN KEY ("replyId") REFERENCES "Reply"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
