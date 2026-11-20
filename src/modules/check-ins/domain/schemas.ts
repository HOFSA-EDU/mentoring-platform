import { z } from "zod";

const identifierSchema = z.string().trim().min(1).max(100);

export const submittedAnswerSchema = z.object({
  questionId: identifierSchema,
  optionId: identifierSchema,
});

export const checkInSubmissionSchema = z
  .object({
    answers: z.array(submittedAnswerSchema).min(1).max(20),
    mentorConversationRequest: z.enum(["YES", "MAYBE", "NO"]),
  })
  .superRefine((submission, context) => {
    const questionIds = submission.answers.map((answer) => answer.questionId);

    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["answers"],
        message: "Each question may be answered only once.",
      });
    }
  });

export type CheckInSubmissionInput = z.input<typeof checkInSubmissionSchema>;
