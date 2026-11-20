import { z } from "zod";

export type AdminFieldErrors = Record<string, string[] | undefined>;

export class AdminOperationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: AdminFieldErrors,
  ) {
    super(message);
    this.name = "AdminOperationError";
  }
}

export function parseAdminInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AdminOperationError(
      "Review the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  return parsed.data;
}

export function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
