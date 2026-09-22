-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'COMPLETED', 'FAILED', 'ABORTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "VideoProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'EXTERNAL_RESOURCE';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isPreview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LessonContent" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "VideoAsset" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailCustom" BOOLEAN NOT NULL DEFAULT false,
    "durationSeconds" INTEGER,
    "fileSizeBytes" BIGINT NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL,
    "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "processingStatus" "VideoProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "captionsUrl" TEXT,
    "transcriptUrl" TEXT,
    "allowDownload" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UploadSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fingerprint" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "bytesReceived" BIGINT NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "lastPositionSec" INTEGER NOT NULL DEFAULT 0,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VideoAsset_contentItemId_key" ON "VideoAsset"("contentItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VideoAsset_processingStatus_idx" ON "VideoAsset"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UploadSession_storageKey_key" ON "UploadSession"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UploadSession_token_key" ON "UploadSession"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UploadSession_userId_status_idx" ON "UploadSession"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UploadSession_courseId_idx" ON "UploadSession"("courseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UploadSession_expiresAt_idx" ON "UploadSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UploadSession_userId_fingerprint_key" ON "UploadSession"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContentProgress_contentItemId_idx" ON "ContentProgress"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ContentProgress_studentId_contentItemId_key" ON "ContentProgress"("studentId", "contentItemId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "LessonContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ContentProgress" ADD CONSTRAINT "ContentProgress_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "LessonContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

