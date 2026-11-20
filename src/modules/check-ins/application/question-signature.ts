import { createHash } from "node:crypto";
import type { DevelopmentDomain, QuestionContext, QuestionType } from "@/generated/prisma/client";

export type SnapshotQuestion = {
  text: string;
  domain: DevelopmentDomain;
  context: QuestionContext;
  type: QuestionType;
  stable: boolean;
  options: Array<{ label: string; value: string; directionValue: number | null; sortOrder: number }>;
};

// Compare a question only while its meaning and full answer scale are unchanged.
// IDs/timestamps are intentionally excluded: idempotent reseeding or an unchanged
// Admin save may replace option rows without changing the question's meaning.
export function questionSignature(question: SnapshotQuestion): string {
  return createHash("sha256").update(JSON.stringify({
    version: 1,
    text: question.text,
    domain: question.domain,
    context: question.context,
    type: question.type,
    stable: question.stable,
    options: [...question.options].sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ label, value, directionValue }) => ({ label, value, directionValue })),
  })).digest("hex");
}
