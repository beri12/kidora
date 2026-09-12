-- LMS course authoring.
--
-- Purely additive: new nullable/defaulted columns, two new enums, one new
-- table, and Resource.courseId/lessonId relaxed to nullable so a resource can
-- live in a teacher's library before it is attached to a lesson. No column is
-- dropped and no row is deleted.
--
-- Written to be safe to re-run: a half-applied migration left behind by an
-- interrupted `migrate deploy` can be resolved and replayed without hand
-- editing the database.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CourseAccess" AS ENUM ('FREE', 'PREMIUM', 'SCHOOL_ONLY', 'INVITE_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "SubmissionType" AS ENUM ('TEXT', 'FILE', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'HEADING';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'PARAGRAPH';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'DOCUMENT';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'CODE';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'CALLOUT';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'EXAMPLE';
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'QUESTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'MATCHING';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ORDERING';

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT IF EXISTS "Resource_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Resource" DROP CONSTRAINT IF EXISTS "Resource_lessonId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "allowResubmit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "rubric" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "submissionType" "SubmissionType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN IF NOT EXISTS "attemptNo" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "rubricScores" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "access" "CourseAccess" NOT NULL DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT,
ADD COLUMN IF NOT EXISTS "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER,
ADD COLUMN IF NOT EXISTS "issuesCertificate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "passingScore" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS "requireAllAssignments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "requireAllLessons" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "requireAllQuizzes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "requireFinalExam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "shortDescription" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "estimatedMin" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "allowRetry" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "sectionId" TEXT,
ADD COLUMN IF NOT EXISTS "showExplanations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "showScore" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS "correctOrder" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS "hint" TEXT,
ADD COLUMN IF NOT EXISTS "pairs" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "mimeType" TEXT,
ADD COLUMN IF NOT EXISTS "schoolId" TEXT,
ADD COLUMN IF NOT EXISTS "teacherId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL,
ALTER COLUMN "lessonId" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CoursePrerequisite" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CoursePrerequisite_prerequisiteId_idx" ON "CoursePrerequisite"("prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CoursePrerequisite_courseId_prerequisiteId_key" ON "CoursePrerequisite"("courseId", "prerequisiteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_teacherId_createdAt_idx" ON "Resource"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_courseId_idx" ON "Resource"("courseId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Resource" ADD CONSTRAINT "Resource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Resource" ADD CONSTRAINT "Resource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Resource" ADD CONSTRAINT "Resource_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Resource" ADD CONSTRAINT "Resource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

