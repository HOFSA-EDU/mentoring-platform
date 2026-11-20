-- CreateEnum
CREATE TYPE "QuestionContext" AS ENUM ('ONBOARDING', 'WEEKLY');

-- CreateEnum
CREATE TYPE "CheckInKind" AS ENUM ('ONBOARDING', 'WEEKLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ONBOARDING_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'WEEKLY_CHECK_IN_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'MENTOR_CONVERSATION_REQUESTED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'CHECK_IN';

-- DropIndex
DROP INDEX "Question_active_stable_sortOrder_idx";

-- DropIndex
DROP INDEX "Question_domain_active_idx";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "context" "QuestionContext" NOT NULL DEFAULT 'WEEKLY';

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "kind" "CheckInKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wantsMentorConversation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInAnswer" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT NOT NULL,
    "questionTextSnapshot" TEXT NOT NULL,
    "optionLabelSnapshot" TEXT NOT NULL,
    "directionValueSnapshot" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CheckInAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckIn_studentId_submittedAt_idx" ON "CheckIn"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "CheckIn_semesterId_periodKey_kind_idx" ON "CheckIn"("semesterId", "periodKey", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_studentId_semesterId_periodKey_key" ON "CheckIn"("studentId", "semesterId", "periodKey");

-- CreateIndex
CREATE INDEX "CheckInAnswer_checkInId_sortOrder_idx" ON "CheckInAnswer"("checkInId", "sortOrder");

-- CreateIndex
CREATE INDEX "CheckInAnswer_questionId_idx" ON "CheckInAnswer"("questionId");

-- CreateIndex
CREATE INDEX "CheckInAnswer_selectedOptionId_idx" ON "CheckInAnswer"("selectedOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInAnswer_checkInId_questionId_key" ON "CheckInAnswer"("checkInId", "questionId");

-- CreateIndex
CREATE INDEX "Question_context_active_stable_sortOrder_idx" ON "Question"("context", "active", "stable", "sortOrder");

-- CreateIndex
CREATE INDEX "Question_context_domain_active_idx" ON "Question"("context", "domain", "active");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInAnswer" ADD CONSTRAINT "CheckInAnswer_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInAnswer" ADD CONSTRAINT "CheckInAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
