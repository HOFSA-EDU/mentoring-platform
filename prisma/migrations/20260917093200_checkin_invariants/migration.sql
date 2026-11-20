-- Onboarding is a first-time baseline, independent of later semester changes.
CREATE UNIQUE INDEX "CheckIn_one_onboarding_per_student"
ON "CheckIn"("studentId") WHERE "kind" = 'ONBOARDING';

-- Keep explicit workflow periods and internal snapshot data structurally valid.
ALTER TABLE "CheckIn"
ADD CONSTRAINT "CheckIn_period_kind_check"
CHECK (
  ("kind" = 'ONBOARDING' AND "periodKey" = 'ONBOARDING' AND "wantsMentorConversation" = false)
  OR
  ("kind" = 'WEEKLY' AND "periodKey" ~ '^[0-9]{4}-W[0-9]{2}$')
);

ALTER TABLE "CheckInAnswer"
ADD CONSTRAINT "CheckInAnswer_direction_value_check"
CHECK ("directionValueSnapshot" BETWEEN 0 AND 3),
ADD CONSTRAINT "CheckInAnswer_sort_order_check"
CHECK ("sortOrder" >= 0),
ADD CONSTRAINT "CheckInAnswer_question_snapshot_check"
CHECK (length(btrim("questionTextSnapshot")) > 0),
ADD CONSTRAINT "CheckInAnswer_option_snapshot_check"
CHECK (length(btrim("optionLabelSnapshot")) > 0);
