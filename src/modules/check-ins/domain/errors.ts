import { z } from "zod";

export type CheckInFieldErrors = Record<string, string[] | undefined>;

export class CheckInOperationError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: CheckInFieldErrors,
  ) {
    super(message);
    this.name = "CheckInOperationError";
  }
}

export function parseCheckInInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new CheckInOperationError(
      "Please answer every question before submitting.",
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
