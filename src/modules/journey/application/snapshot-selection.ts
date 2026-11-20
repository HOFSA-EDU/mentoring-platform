import type { Prisma } from "@/generated/prisma/client";

// Internal evidence projection shared by Student and Mentor readers. Consumers
// must authorise their own scope and return presentation DTOs, never these values.
export const reflectionCheckInSelect = {
  id: true, semesterId: true, kind: true, periodKey: true, submittedAt: true,
  mentorConversationRequest: true,
  answers: {
    select: {
      questionId: true, questionTextSnapshot: true, optionLabelSnapshot: true,
      directionValueSnapshot: true, domainSnapshot: true, stableSnapshot: true,
      questionSignatureSnapshot: true, sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.CheckInSelect;
