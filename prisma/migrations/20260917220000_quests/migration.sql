-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestAttempt" AS ENUM ('YES', 'PARTLY', 'NO');

-- CreateEnum
CREATE TYPE "QuestHelpfulness" AS ENUM ('YES', 'A_LITTLE', 'NO', 'NOT_SURE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'QUEST_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'QUEST_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'QUEST_REFLECTION_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'QUEST_COMPLETED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntityType" ADD VALUE 'QUEST_ASSIGNMENT';
ALTER TYPE "AuditEntityType" ADD VALUE 'QUEST_REFLECTION';

-- CreateTable
CREATE TABLE "QuestAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "questTemplateId" TEXT,
    "mentoringConversationId" TEXT,
    "sharedAgreementId" TEXT,
    "submissionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" "DevelopmentDomain" NOT NULL,
    "reflectionPromptSnapshot" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATE NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeSlot" INTEGER,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestReflection" (
    "id" TEXT NOT NULL,
    "questAssignmentId" TEXT NOT NULL,
    "attempted" "QuestAttempt" NOT NULL,
    "helpful" "QuestHelpfulness" NOT NULL,
    "reflectionText" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestAssignment_studentId_status_assignedAt_idx" ON "QuestAssignment"("studentId", "status", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestAssignment_studentId_activeSlot_key" ON "QuestAssignment"("studentId", "activeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "QuestAssignment_mentorId_submissionKey_key" ON "QuestAssignment"("mentorId", "submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuestReflection_questAssignmentId_key" ON "QuestReflection"("questAssignmentId");

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_questTemplateId_fkey" FOREIGN KEY ("questTemplateId") REFERENCES "QuestTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_mentoringConversationId_studentId_fkey" FOREIGN KEY ("mentoringConversationId", "studentId") REFERENCES "MentoringConversation"("id", "studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_sharedAgreementId_fkey" FOREIGN KEY ("sharedAgreementId") REFERENCES "SharedAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestReflection" ADD CONSTRAINT "QuestReflection_questAssignmentId_fkey" FOREIGN KEY ("questAssignmentId") REFERENCES "QuestAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Two unique, bounded capacity slots enforce the active limit even for writers
-- outside the application. Historical assignments release their slot.
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "quest_status_capacity_dates" CHECK (
  ("status" = 'ACTIVE' AND "activeSlot" IS NOT NULL AND "activeSlot" IN (1, 2) AND "completedAt" IS NULL AND "cancelledAt" IS NULL) OR
  ("status" = 'COMPLETED' AND "activeSlot" IS NULL AND "completedAt" IS NOT NULL AND "completedAt" >= "assignedAt" AND "cancelledAt" IS NULL) OR
  ("status" = 'CANCELLED' AND "activeSlot" IS NULL AND "completedAt" IS NULL AND "cancelledAt" IS NOT NULL AND "cancelledAt" >= "assignedAt")
);
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "quest_wording_lengths" CHECK (
  length(btrim("title")) BETWEEN 2 AND 100 AND length(btrim("description")) BETWEEN 10 AND 1000
  AND length(btrim("reflectionPromptSnapshot")) BETWEEN 1 AND 300
);
ALTER TABLE "QuestReflection" ADD CONSTRAINT "quest_reflection_length" CHECK (
  "reflectionText" IS NULL OR length("reflectionText") <= 2000
);

CREATE FUNCTION validate_quest_links() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."sharedAgreementId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "SharedAgreement" a JOIN "MentoringConversation" c ON c."id" = a."conversationId"
    WHERE a."id" = NEW."sharedAgreementId" AND c."studentId" = NEW."studentId"
      AND c."id" = NEW."mentoringConversationId"
  ) THEN RAISE EXCEPTION 'Quest agreement must match the student and conversation'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quest_links BEFORE INSERT ON "QuestAssignment" FOR EACH ROW EXECUTE FUNCTION validate_quest_links();

CREATE FUNCTION preserve_quest_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" <> 'ACTIVE' OR NEW."status" NOT IN ('COMPLETED', 'CANCELLED')
    OR (to_jsonb(NEW) - ARRAY['status', 'activeSlot', 'completedAt', 'cancelledAt', 'updatedAt'])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'activeSlot', 'completedAt', 'cancelledAt', 'updatedAt'])
  THEN RAISE EXCEPTION 'Quest wording and history are immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quest_assignment_history BEFORE UPDATE ON "QuestAssignment" FOR EACH ROW EXECUTE FUNCTION preserve_quest_assignment();
CREATE TRIGGER quest_reflection_immutable BEFORE UPDATE ON "QuestReflection" FOR EACH ROW EXECUTE FUNCTION preserve_mentoring_record();

CREATE FUNCTION validate_quest_reflection() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target "QuestAssignment"%ROWTYPE;
BEGIN
  SELECT * INTO target FROM "QuestAssignment" WHERE "id" = NEW."questAssignmentId" FOR UPDATE;
  IF target."id" IS NULL OR target."status" <> 'ACTIVE' OR NEW."submittedAt" < target."assignedAt"
    THEN RAISE EXCEPTION 'Only an active Quest can receive a reflection'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quest_reflection_active BEFORE INSERT ON "QuestReflection" FOR EACH ROW EXECUTE FUNCTION validate_quest_reflection();

-- Deferred checks permit the reflection + completion transaction, but prohibit
-- a completed Quest without a reflection or an ACTIVE/CANCELLED reflected Quest.
CREATE FUNCTION quest_completion_consistent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE quest_id TEXT; target "QuestAssignment"%ROWTYPE; reflection "QuestReflection"%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'QuestAssignment' THEN quest_id := NEW."id";
  ELSE quest_id := NEW."questAssignmentId"; END IF;
  SELECT * INTO target FROM "QuestAssignment" WHERE "id" = quest_id;
  IF target."id" IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO reflection FROM "QuestReflection" WHERE "questAssignmentId" = quest_id;
  IF (target."status" = 'COMPLETED' AND (reflection."id" IS NULL OR target."completedAt" IS DISTINCT FROM reflection."submittedAt"))
    OR (target."status" <> 'COMPLETED' AND reflection."id" IS NOT NULL)
  THEN RAISE EXCEPTION 'Quest completion requires its saved reflection'; END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER quest_completion_check AFTER INSERT OR UPDATE ON "QuestAssignment"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION quest_completion_consistent();
CREATE CONSTRAINT TRIGGER quest_reflection_completion_check AFTER INSERT ON "QuestReflection"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION quest_completion_consistent();
