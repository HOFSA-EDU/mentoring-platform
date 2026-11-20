-- CreateEnum
CREATE TYPE "ObservationType" AS ENUM ('REPEATED_DIFFICULTY', 'WORSENING_PATTERN', 'IMPROVEMENT', 'CONVERSATION_REQUEST');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'OBSERVATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'OBSERVATION_ACKNOWLEDGED';
ALTER TYPE "AuditAction" ADD VALUE 'OBSERVATION_RESOLVED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE 'OBSERVATION';

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "domain" "DevelopmentDomain",
    "type" "ObservationType" NOT NULL,
    "status" "ObservationStatus" NOT NULL DEFAULT 'OPEN',
    "ruleKey" TEXT NOT NULL,
    "episodeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObservationEvidence" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "checkInAnswerId" TEXT,
    "periodKey" TEXT NOT NULL,
    "questionId" TEXT,
    "questionTextSnapshot" TEXT NOT NULL,
    "optionLabelSnapshot" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Observation_studentId_status_lastDetectedAt_idx" ON "Observation"("studentId", "status", "lastDetectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Observation_studentId_semesterId_ruleKey_episodeKey_key" ON "Observation"("studentId", "semesterId", "ruleKey", "episodeKey");

-- CreateIndex
CREATE INDEX "ObservationEvidence_checkInId_idx" ON "ObservationEvidence"("checkInId");

-- CreateIndex
CREATE INDEX "ObservationEvidence_checkInAnswerId_idx" ON "ObservationEvidence"("checkInAnswerId");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationEvidence_observationId_sourceKey_key" ON "ObservationEvidence"("observationId", "sourceKey");

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationEvidence" ADD CONSTRAINT "ObservationEvidence_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationEvidence" ADD CONSTRAINT "ObservationEvidence_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationEvidence" ADD CONSTRAINT "ObservationEvidence_checkInAnswerId_fkey" FOREIGN KEY ("checkInAnswerId") REFERENCES "CheckInAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One unresolved episode per rule; acknowledgement does not close an episode.
CREATE UNIQUE INDEX "Observation_one_unresolved_rule"
ON "Observation"("studentId", "semesterId", "ruleKey") WHERE "status" <> 'RESOLVED';
ALTER TABLE "Observation"
  ADD CONSTRAINT "Observation_domain_type_check" CHECK (("type" = 'CONVERSATION_REQUEST') = ("domain" IS NULL)),
  ADD CONSTRAINT "Observation_dates_check" CHECK ("firstDetectedAt" <= "lastDetectedAt"),
  ADD CONSTRAINT "Observation_resolution_check" CHECK (("status" = 'RESOLVED') = ("resolvedAt" IS NOT NULL)),
  ADD CONSTRAINT "Observation_acknowledgement_check" CHECK ("status" <> 'ACKNOWLEDGED' OR "acknowledgedAt" IS NOT NULL);

-- Snapshot evidence is append-only and must match its actual historical source.
CREATE FUNCTION validate_observation_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_check_in "CheckIn"; source_answer "CheckInAnswer"; parent "Observation";
BEGIN
  IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'Observation evidence is immutable'; END IF;
  SELECT * INTO parent FROM "Observation" WHERE "id" = NEW."observationId";
  SELECT * INTO source_check_in FROM "CheckIn" WHERE "id" = NEW."checkInId";
  IF parent."status" = 'RESOLVED' OR source_check_in."kind" <> 'WEEKLY'
     OR source_check_in."studentId" <> parent."studentId" OR source_check_in."semesterId" <> parent."semesterId"
     OR NEW."periodKey" <> source_check_in."periodKey" OR NEW."submittedAt" <> source_check_in."submittedAt" THEN
    RAISE EXCEPTION 'Observation evidence does not match its Check-in';
  END IF;
  IF NEW."checkInAnswerId" IS NULL THEN
    IF parent."type" <> 'CONVERSATION_REQUEST' OR source_check_in."mentorConversationRequest" <> 'YES'
       OR NEW."questionId" IS NOT NULL OR NEW."questionTextSnapshot" <> 'Mentor conversation response'
       OR NEW."optionLabelSnapshot" <> 'Yes' OR NEW."sourceKey" <> 'conversation:' || source_check_in."id" THEN
      RAISE EXCEPTION 'Invalid conversation evidence';
    END IF;
  ELSE
    SELECT * INTO source_answer FROM "CheckInAnswer" WHERE "id" = NEW."checkInAnswerId";
    IF parent."type" = 'CONVERSATION_REQUEST' OR source_answer."checkInId" IS DISTINCT FROM NEW."checkInId"
       OR source_answer."domainSnapshot" IS DISTINCT FROM parent."domain" OR source_answer."directionValueSnapshot" IS NULL
       OR NEW."questionId" IS DISTINCT FROM source_answer."questionId"
       OR NEW."questionTextSnapshot" IS DISTINCT FROM source_answer."questionTextSnapshot"
       OR NEW."optionLabelSnapshot" IS DISTINCT FROM source_answer."optionLabelSnapshot"
       OR NEW."sourceKey" <> 'answer:' || source_answer."id" THEN
      RAISE EXCEPTION 'Observation evidence does not match its answer';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ObservationEvidence_immutable_source" BEFORE INSERT OR UPDATE ON "ObservationEvidence"
FOR EACH ROW EXECUTE FUNCTION validate_observation_evidence();

CREATE FUNCTION protect_resolved_observation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'RESOLVED' THEN RAISE EXCEPTION 'Resolved observation history is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Observation_resolved_history" BEFORE UPDATE ON "Observation"
FOR EACH ROW EXECUTE FUNCTION protect_resolved_observation();
