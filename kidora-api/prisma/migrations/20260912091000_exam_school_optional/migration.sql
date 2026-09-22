-- A platform-wide course has no school, so its final exam could not be created
-- at all while Exam.schoolId was NOT NULL. Relaxing the column only widens what
-- is accepted; every existing row keeps its value.

ALTER TABLE "Exam" ALTER COLUMN "schoolId" DROP NOT NULL;
