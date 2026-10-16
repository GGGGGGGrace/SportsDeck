-- Add match statuses returned by football-data.org that were missing from the enum
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'IN_PLAY';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'AWARDED';

-- Cascade deletes from parent content to its children so threads/posts/polls can be deleted
ALTER TABLE "Post" DROP CONSTRAINT "Post_threadId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Reply" DROP CONSTRAINT "Reply_postId_fkey";
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreadTag" DROP CONSTRAINT "ThreadTag_threadId_fkey";
ALTER TABLE "ThreadTag" ADD CONSTRAINT "ThreadTag_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Poll" DROP CONSTRAINT "Poll_threadId_fkey";
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_pollId_fkey";
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PollVote" DROP CONSTRAINT "PollVote_optionId_fkey";
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
