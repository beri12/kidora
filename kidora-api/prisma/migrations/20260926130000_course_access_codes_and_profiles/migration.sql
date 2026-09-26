-- CreateEnum
CREATE TYPE "EnrollmentSource" AS ENUM ('SELF', 'ACCESS_CODE', 'PARENT', 'TEACHER', 'SCHOOL', 'SCHOOL_LEADER', 'CLASS', 'ADMIN');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "accessCodeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "accessCodeRotatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CourseEnrollment" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "source" "EnrollmentSource" NOT NULL DEFAULT 'SELF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "gradeLevel" TEXT,
ADD COLUMN     "requestedSchoolId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Course_accessCode_key" ON "Course"("accessCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_requestedSchoolId_fkey" FOREIGN KEY ("requestedSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateIndex
CREATE INDEX "User_requestedSchoolId_idx" ON "User"("requestedSchoolId");
