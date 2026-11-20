-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT;

-- Backfill existing Phase 00 development users before enforcing the constraint.
UPDATE "User"
SET "passwordHash" = '$2b$12$JPuDCu4sZk4yjnxvdMbPAOWYsuOvWE/gOMZNrDfui9xCWm8oqoZPe'
WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");
