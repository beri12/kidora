-- Verification and approval for administrative roles.
--
-- Choosing "School Leader" or "District Leader" no longer grants the role. It
-- records an OrgAccessRequest, and the role is written onto the User only when
-- a reviewer approves it — or immediately, when the request arrives with a
-- valid organisation join code, because the organisation vouched for the
-- person by giving them that code.

-- CreateEnum
CREATE TYPE "OrgRequestStatus" AS ENUM ('PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- AlterTable: districts get the same invite mechanism schools already have.
ALTER TABLE "District" ADD COLUMN "joinCode" TEXT;
CREATE UNIQUE INDEX "District_joinCode_key" ON "District"("joinCode");

-- CreateTable
CREATE TABLE "OrgAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedRole" "Role" NOT NULL,
    "status" "OrgRequestStatus" NOT NULL DEFAULT 'PENDING',
    "organizationName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "website" TEXT,
    "workEmail" TEXT,
    "contactPhone" TEXT,
    "studentCount" INTEGER,
    "evidenceUrl" TEXT,
    "note" TEXT,
    "schoolId" TEXT,
    "districtId" TEXT,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgAccessRequest_status_createdAt_idx" ON "OrgAccessRequest"("status", "createdAt");
CREATE INDEX "OrgAccessRequest_userId_status_idx" ON "OrgAccessRequest"("userId", "status");

-- A user may have at most one request still open. Enforced here as well as in
-- the service, so a double-submitted form cannot create two pending claims.
CREATE UNIQUE INDEX "OrgAccessRequest_one_open_per_user"
    ON "OrgAccessRequest"("userId")
    WHERE "status" IN ('PENDING', 'CHANGES_REQUESTED');

-- AddForeignKey
ALTER TABLE "OrgAccessRequest" ADD CONSTRAINT "OrgAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgAccessRequest" ADD CONSTRAINT "OrgAccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrgAccessRequest" ADD CONSTRAINT "OrgAccessRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrgAccessRequest" ADD CONSTRAINT "OrgAccessRequest_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
