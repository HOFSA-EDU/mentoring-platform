-- CreateEnum
CREATE TYPE "DevelopmentDomain" AS ENUM ('ORGANISATION', 'WORK_START', 'HELP_SEEKING', 'LEARNING_UNDERSTANDING', 'PERCEIVED_WORKLOAD', 'STUDY_CONFIDENCE');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'SCALE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('STUDENT_CREATED', 'MENTOR_CREATED', 'ACCOUNT_UPDATED', 'ACCOUNT_ACTIVATED', 'ACCOUNT_DEACTIVATED', 'MENTOR_ASSIGNED', 'MENTOR_REASSIGNED', 'MENTOR_ASSIGNMENT_DEACTIVATED', 'SEMESTER_CREATED', 'SEMESTER_UPDATED', 'SEMESTER_ACTIVATED', 'SEMESTER_DEACTIVATED', 'QUESTION_CREATED', 'QUESTION_UPDATED', 'QUEST_TEMPLATE_CREATED', 'QUEST_TEMPLATE_UPDATED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'MENTOR_ASSIGNMENT', 'SEMESTER', 'QUESTION', 'QUEST_TEMPLATE');

-- DropForeignKey
ALTER TABLE "MentorAssignment" DROP CONSTRAINT "MentorAssignment_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "MentorAssignment" DROP CONSTRAINT "MentorAssignment_studentId_fkey";

-- DropIndex
DROP INDEX "MentorAssignment_studentId_mentorId_key";

-- AlterTable
ALTER TABLE "MentorAssignment" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Semester" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

UPDATE "Semester" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
ALTER TABLE "Semester" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "domain" "DevelopmentDomain" NOT NULL,
    "type" "QuestionType" NOT NULL,
    "stable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "directionValue" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" "DevelopmentDomain" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "defaultDurationDays" INTEGER NOT NULL,
    "reflectionPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_key_key" ON "Question"("key");

-- CreateIndex
CREATE INDEX "Question_active_stable_sortOrder_idx" ON "Question"("active", "stable", "sortOrder");

-- CreateIndex
CREATE INDEX "Question_domain_active_idx" ON "Question"("domain", "active");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_value_key" ON "QuestionOption"("questionId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOption_questionId_sortOrder_key" ON "QuestionOption"("questionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuestTemplate_key_key" ON "QuestTemplate"("key");

-- CreateIndex
CREATE INDEX "QuestTemplate_domain_active_idx" ON "QuestTemplate"("domain", "active");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_createdAt_idx" ON "AuditEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "MentorAssignment_studentId_mentorId_assignedAt_idx" ON "MentorAssignment"("studentId", "mentorId", "assignedAt");

-- Enforce current-state invariants while retaining unrestricted history rows.
CREATE UNIQUE INDEX "MentorAssignment_one_active_per_student"
ON "MentorAssignment"("studentId") WHERE "active" = true;

CREATE UNIQUE INDEX "Semester_one_active"
ON "Semester"("active") WHERE "active" = true;

ALTER TABLE "MentorAssignment"
ADD CONSTRAINT "MentorAssignment_active_dates_check"
CHECK (("active" = true AND "deactivatedAt" IS NULL) OR ("active" = false AND "deactivatedAt" IS NOT NULL));

ALTER TABLE "Semester"
ADD CONSTRAINT "Semester_date_range_check" CHECK ("startDate" < "endDate");

ALTER TABLE "Question"
ADD CONSTRAINT "Question_sort_order_check" CHECK ("sortOrder" >= 0);

ALTER TABLE "QuestionOption"
ADD CONSTRAINT "QuestionOption_direction_value_check" CHECK ("directionValue" BETWEEN 0 AND 3),
ADD CONSTRAINT "QuestionOption_sort_order_check" CHECK ("sortOrder" >= 0);

ALTER TABLE "QuestTemplate"
ADD CONSTRAINT "QuestTemplate_duration_check" CHECK ("defaultDurationDays" BETWEEN 1 AND 365);

-- AddForeignKey
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
