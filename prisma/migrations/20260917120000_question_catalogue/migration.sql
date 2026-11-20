BEGIN;

-- NULL means unscored (neutral, uncertain, or not applicable), never zero.
-- Existing 0..3 values and all historical answer snapshots are retained.
ALTER TABLE "QuestionOption" ALTER COLUMN "directionValue" DROP NOT NULL;
ALTER TABLE "CheckInAnswer" ALTER COLUMN "directionValueSnapshot" DROP NOT NULL;

CREATE TYPE "MentorConversationRequest" AS ENUM ('YES', 'MAYBE', 'NO');
ALTER TABLE "CheckIn" DROP CONSTRAINT "CheckIn_period_kind_check";
ALTER TABLE "CheckIn" ADD COLUMN "mentorConversationRequest" "MentorConversationRequest" NOT NULL DEFAULT 'NO';
UPDATE "CheckIn" SET "mentorConversationRequest" =
  CASE WHEN "wantsMentorConversation" THEN 'YES'::"MentorConversationRequest"
       ELSE 'NO'::"MentorConversationRequest" END;
ALTER TABLE "CheckIn" DROP COLUMN "wantsMentorConversation";
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_period_kind_check" CHECK (
  ("kind" = 'ONBOARDING' AND "periodKey" = 'ONBOARDING' AND "mentorConversationRequest" = 'NO')
  OR
  ("kind" = 'WEEKLY' AND "periodKey" ~ '^[0-9]{4}-W[0-9]{2}$')
);

COMMIT;
