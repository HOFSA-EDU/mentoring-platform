-- Preserve the meaning of future answers independently of mutable Question rows.
-- Legacy rows remain NULL: their full historical option scale/domain cannot be
-- reconstructed reliably, and must not be silently guessed or reinterpreted.
ALTER TABLE "CheckInAnswer"
  ADD COLUMN "domainSnapshot" "DevelopmentDomain",
  ADD COLUMN "stableSnapshot" BOOLEAN,
  ADD COLUMN "questionSignatureSnapshot" TEXT;

ALTER TABLE "CheckInAnswer" ADD CONSTRAINT "CheckInAnswer_comparison_metadata_check"
CHECK (
  ("domainSnapshot" IS NULL AND "stableSnapshot" IS NULL AND "questionSignatureSnapshot" IS NULL)
  OR
  ("domainSnapshot" IS NOT NULL AND "stableSnapshot" IS NOT NULL
    AND "questionSignatureSnapshot" IS NOT NULL
    AND "questionSignatureSnapshot" ~ '^[0-9a-f]{64}$')
);
