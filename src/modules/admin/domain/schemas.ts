import { z } from "zod";

export const developmentDomains = [
  "ORGANISATION",
  "WORK_START",
  "HELP_SEEKING",
  "LEARNING_UNDERSTANDING",
  "PERCEIVED_WORKLOAD",
  "STUDY_CONFIDENCE",
] as const;

export const questionTypes = ["SINGLE_CHOICE", "SCALE", "BOOLEAN"] as const;
export const questionContexts = ["ONBOARDING", "WEEKLY"] as const;

export const developmentDomainSchema = z.enum(developmentDomains);
export const questionTypeSchema = z.enum(questionTypes);
export const questionContextSchema = z.enum(questionContexts);

const entityIdSchema = z.string().trim().min(1, "Select a valid record.").max(100);
const nameSchema = z.string().trim().min(2, "Name must contain at least 2 characters.").max(100);
const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .transform((email) => email.toLowerCase());

export const initialPasswordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128, "Password must contain at most 128 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export const createStudentSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: initialPasswordSchema,
  semesterId: entityIdSchema,
});

export const updateStudentSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  semesterId: entityIdSchema,
});

export const createMentorSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: initialPasswordSchema,
});

export const updateMentorSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export const accountStateSchema = z.object({
  userId: entityIdSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export const assignmentSchema = z.object({
  studentProfileId: entityIdSchema,
  mentorProfileId: entityIdSchema,
});

export const assignmentStateSchema = z.object({
  assignmentId: entityIdSchema,
});

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const semesterSchema = z
  .object({
    name: z.string().trim().min(2, "Name must contain at least 2 characters.").max(100),
    startDate: dateSchema,
    endDate: dateSchema,
    active: z.enum(["true", "false"]).transform((value) => value === "true"),
  })
  .superRefine((semester, context) => {
    if (semester.endDate <= semester.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after the start date.",
      });
    }
  });

const keySchema = z
  .string()
  .trim()
  .min(2, "Key is required.")
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Use uppercase letters, numbers, and underscores.");

export const questionOptionSchema = z.object({
  label: z.string().trim().min(1, "Option label is required.").max(120),
  value: z
    .string()
    .trim()
    .min(1, "Option value is required.")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  directionValue: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.coerce.number().int().min(0).max(3).nullable(),
  ),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export const questionSchema = z
  .object({
    key: keySchema,
    text: z.string().trim().min(10, "Question text must contain at least 10 characters.").max(300),
    domain: developmentDomainSchema,
    type: questionTypeSchema,
    context: questionContextSchema.default("WEEKLY"),
    stable: z.enum(["true", "false"]).transform((value) => value === "true"),
    active: z.enum(["true", "false"]).transform((value) => value === "true"),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    options: z.array(questionOptionSchema).min(2, "Add at least two answer options.").max(7),
  })
  .superRefine((question, context) => {
    const values = question.options.map((option) => option.value);
    const sortOrders = question.options.map((option) => option.sortOrder);

    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option values must be unique.",
      });
    }

    if (new Set(sortOrders).size !== sortOrders.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option sort orders must be unique.",
      });
    }

    if (question.context === "ONBOARDING" && question.stable) {
      context.addIssue({
        code: "custom",
        path: ["stable"],
        message: "Onboarding questions cannot be marked as stable weekly questions.",
      });
    }
  });

export const questTemplateSchema = z.object({
  key: keySchema,
  title: z.string().trim().min(2, "Title is required.").max(100),
  description: z.string().trim().min(20, "Description must contain at least 20 characters.").max(500),
  domain: developmentDomainSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  defaultDurationDays: z.coerce.number().int().min(1).max(365),
  reflectionPrompt: z.string().trim().min(10, "Reflection prompt must contain at least 10 characters.").max(300),
});

export const entityStateSchema = z.object({
  id: entityIdSchema,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type CreateStudentInput = z.input<typeof createStudentSchema>;
export type UpdateStudentInput = z.input<typeof updateStudentSchema>;
export type CreateMentorInput = z.input<typeof createMentorSchema>;
export type UpdateMentorInput = z.input<typeof updateMentorSchema>;
export type SemesterInput = z.input<typeof semesterSchema>;
export type QuestionInput = z.input<typeof questionSchema>;
export type QuestTemplateInput = z.input<typeof questTemplateSchema>;
