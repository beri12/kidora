-- Learning games: content (Game / GameLevel / GameChallenge), play records
-- (GameSession / GameAttempt) and per-skill mastery (StudentSkill).
-- Additive only. The new enum values are first used by runtime content.


-- CreateEnum
CREATE TYPE "GameChallengeKind" AS ENUM ('MULTIPLE_CHOICE', 'CODE_PATH', 'PHYSICS_LAUNCH');

-- AlterEnum
ALTER TYPE "MissionMetric" ADD VALUE 'GAME_LEVELS_COMPLETED';

-- AlterEnum
ALTER TYPE "World" ADD VALUE 'HISTORY_WORLD';

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "world" "World" NOT NULL,
    "subject" TEXT NOT NULL,
    "minGrade" INTEGER NOT NULL DEFAULT 1,
    "maxGrade" INTEGER NOT NULL DEFAULT 8,
    "badgeSlug" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLevel" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "learningObjective" TEXT NOT NULL DEFAULT '',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "xpPerCorrect" INTEGER NOT NULL DEFAULT 10,
    "xpReward" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "GameLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameChallenge" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "GameChallengeKind" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "skill" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "speaker" TEXT,
    "setup" JSONB NOT NULL DEFAULT '{}',
    "solution" JSONB NOT NULL,
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "explanation" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'en',

    CONSTRAINT "GameChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "bonus" JSONB,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "answer" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GameLevel_gameId_order_key" ON "GameLevel"("gameId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "GameChallenge_levelId_order_key" ON "GameChallenge"("levelId", "order");

-- CreateIndex
CREATE INDEX "GameSession_userId_gameId_idx" ON "GameSession"("userId", "gameId");

-- CreateIndex
CREATE INDEX "GameSession_userId_completed_idx" ON "GameSession"("userId", "completed");

-- CreateIndex
CREATE INDEX "GameAttempt_sessionId_challengeId_idx" ON "GameAttempt"("sessionId", "challengeId");

-- CreateIndex
CREATE INDEX "StudentSkill_userId_subject_idx" ON "StudentSkill"("userId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSkill_userId_skill_key" ON "StudentSkill"("userId", "skill");

-- AddForeignKey
ALTER TABLE "GameLevel" ADD CONSTRAINT "GameLevel_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChallenge" ADD CONSTRAINT "GameChallenge_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "GameLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "GameLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "GameChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkill" ADD CONSTRAINT "StudentSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

