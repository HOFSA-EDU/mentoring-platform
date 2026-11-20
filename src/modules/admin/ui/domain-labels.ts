import type {
  DevelopmentDomain,
  QuestionContext,
  QuestionType,
} from "@/generated/prisma/client";

export const domainLabels: Record<DevelopmentDomain, string> = {
  ORGANISATION: "Organisation",
  WORK_START: "Work start",
  HELP_SEEKING: "Help seeking",
  LEARNING_UNDERSTANDING: "Learning understanding",
  PERCEIVED_WORKLOAD: "Perceived workload",
  STUDY_CONFIDENCE: "Study confidence",
};

export const questionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  SCALE: "Scale",
  BOOLEAN: "Boolean",
};

export const questionContextLabels: Record<QuestionContext, string> = {
  ONBOARDING: "Onboarding",
  WEEKLY: "Weekly Check-in",
};
