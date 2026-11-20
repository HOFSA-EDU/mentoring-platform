-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MENTORING_CONVERSATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SHARED_AGREEMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FOLLOW_UP_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FOLLOW_UP_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'FOLLOW_UP_CANCELLED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntityType" ADD VALUE 'MENTORING_CONVERSATION';
ALTER TYPE "AuditEntityType" ADD VALUE 'SHARED_AGREEMENT';
ALTER TYPE "AuditEntityType" ADD VALUE 'FOLLOW_UP';

-- CreateTable
CREATE TABLE "MentoringConversation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "submissionKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "privateNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentoringConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedAgreement" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentoringConversationObservation" (
    "conversationId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "MentoringConversationObservation_pkey" PRIMARY KEY ("conversationId","observationId")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "dueAt" DATE NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentoringConversation_studentId_occurredAt_idx" ON "MentoringConversation"("studentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MentoringConversation_mentorId_submissionKey_key" ON "MentoringConversation"("mentorId", "submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "MentoringConversation_id_studentId_key" ON "MentoringConversation"("id", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MentoringConversation_id_studentId_mentorId_key" ON "MentoringConversation"("id", "studentId", "mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedAgreement_conversationId_key" ON "SharedAgreement"("conversationId");

-- CreateIndex
CREATE INDEX "MentoringConversationObservation_observationId_studentId_idx" ON "MentoringConversationObservation"("observationId", "studentId");

-- CreateIndex
CREATE INDEX "FollowUp_studentId_status_dueAt_idx" ON "FollowUp"("studentId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Observation_id_studentId_key" ON "Observation"("id", "studentId");

-- AddForeignKey
ALTER TABLE "MentoringConversation" ADD CONSTRAINT "MentoringConversation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringConversation" ADD CONSTRAINT "MentoringConversation_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringConversation" ADD CONSTRAINT "MentoringConversation_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedAgreement" ADD CONSTRAINT "SharedAgreement_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MentoringConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringConversationObservation" ADD CONSTRAINT "MentoringConversationObservation_conversationId_studentId_fkey" FOREIGN KEY ("conversationId", "studentId") REFERENCES "MentoringConversation"("id", "studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringConversationObservation" ADD CONSTRAINT "MentoringConversationObservation_observationId_studentId_fkey" FOREIGN KEY ("observationId", "studentId") REFERENCES "Observation"("id", "studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "MentorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_conversationId_studentId_mentorId_fkey" FOREIGN KEY ("conversationId", "studentId", "mentorId") REFERENCES "MentoringConversation"("id", "studentId", "mentorId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MentoringConversation" ADD CONSTRAINT "mentoring_topic_length"
  CHECK (length(btrim("topic")) BETWEEN 1 AND 160);
ALTER TABLE "MentoringConversation" ADD CONSTRAINT "mentoring_private_note_length"
  CHECK ("privateNote" IS NULL OR length("privateNote") <= 4000);
ALTER TABLE "SharedAgreement" ADD CONSTRAINT "shared_agreement_length"
  CHECK (length(btrim("text")) BETWEEN 1 AND 2000);
ALTER TABLE "FollowUp" ADD CONSTRAINT "follow_up_note_length"
  CHECK ("note" IS NULL OR length("note") <= 2000);
ALTER TABLE "FollowUp" ADD CONSTRAINT "follow_up_status_dates" CHECK (
  ("status" = 'OPEN' AND "completedAt" IS NULL AND "cancelledAt" IS NULL) OR
  ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "cancelledAt" IS NULL) OR
  ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "completedAt" IS NULL)
);

-- This MVP records immutable conversations and agreements; no silent editing.
CREATE FUNCTION preserve_mentoring_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Recorded mentoring history is immutable';
END;
$$;
CREATE TRIGGER mentoring_conversation_immutable BEFORE UPDATE ON "MentoringConversation"
  FOR EACH ROW EXECUTE FUNCTION preserve_mentoring_record();
CREATE TRIGGER shared_agreement_immutable BEFORE UPDATE ON "SharedAgreement"
  FOR EACH ROW EXECUTE FUNCTION preserve_mentoring_record();
CREATE TRIGGER mentoring_observation_link_immutable BEFORE UPDATE ON "MentoringConversationObservation"
  FOR EACH ROW EXECUTE FUNCTION preserve_mentoring_record();

CREATE FUNCTION preserve_follow_up_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" <> 'OPEN' OR NEW."status" = 'OPEN'
    OR NEW."studentId" IS DISTINCT FROM OLD."studentId"
    OR NEW."mentorId" IS DISTINCT FROM OLD."mentorId"
    OR NEW."conversationId" IS DISTINCT FROM OLD."conversationId"
    OR NEW."dueAt" IS DISTINCT FROM OLD."dueAt"
    OR NEW."note" IS DISTINCT FROM OLD."note" THEN
    RAISE EXCEPTION 'Follow-ups may only be completed or cancelled';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER follow_up_history BEFORE UPDATE ON "FollowUp"
  FOR EACH ROW EXECUTE FUNCTION preserve_follow_up_history();
