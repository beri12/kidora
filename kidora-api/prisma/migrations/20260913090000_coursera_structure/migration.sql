-- Coursera-shaped course structure.
--
-- Section gains a week number, so a module can be "Week 3". LessonContent
-- becomes the ordered item list a lesson is made of, carrying per-item
-- duration and required-ness, video transcripts and in-video checkpoints,
-- and reading attachments. Items of type QUIZ / ASSIGNMENT / PEER_REVIEW
-- point at the existing Quiz and Assignment rows rather than duplicating
-- them, so one sequence per lesson covers every item type.
--
-- Peer review reuses AssignmentSubmission: a peer-reviewed assignment is one
-- whose reviewers are classmates instead of the teacher.
--
-- Additive and re-runnable. No column dropped, no row deleted.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "QuizGrading" AS ENUM ('FORMATIVE', 'SUMMATIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PeerReviewStatus" AS ENUM ('ASSIGNED', 'SUBMITTED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'QUIZ';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'PEER_REVIEW';

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "peerReviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "peerReviewsDue" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN IF NOT EXISTS "peerScore" INTEGER;

-- AlterTable
ALTER TABLE "LessonContent" ADD COLUMN IF NOT EXISTS "assignmentId" TEXT,
ADD COLUMN IF NOT EXISTS "checkpoints" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "downloadUrls" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER,
ADD COLUMN IF NOT EXISTS "estimatedMin" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "quizId" TEXT,
ADD COLUMN IF NOT EXISTS "transcriptVtt" TEXT;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "grading" "QuizGrading" NOT NULL DEFAULT 'FORMATIVE';

-- AlterTable
ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PeerReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "PeerReviewStatus" NOT NULL DEFAULT 'ASSIGNED',
    "scores" JSONB NOT NULL DEFAULT '[]',
    "total" INTEGER,
    "comment" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PeerReview_reviewerId_status_idx" ON "PeerReview"("reviewerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PeerReview_submissionId_reviewerId_key" ON "PeerReview"("submissionId", "reviewerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonContent_quizId_idx" ON "LessonContent"("quizId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonContent_assignmentId_idx" ON "LessonContent"("assignmentId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "LessonContent" ADD CONSTRAINT "LessonContent_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "LessonContent" ADD CONSTRAINT "LessonContent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

