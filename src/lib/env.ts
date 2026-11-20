import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must use the PostgreSQL protocol.",
    ),
});

const authEnvironmentSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters."),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;
export type AuthEnvironment = z.infer<typeof authEnvironmentSchema>;

export function parseDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): DatabaseEnvironment {
  return databaseEnvironmentSchema.parse(environment);
}

export function getDatabaseEnvironment(): DatabaseEnvironment {
  return parseDatabaseEnvironment(process.env);
}

export function parseAuthEnvironment(
  environment: Record<string, string | undefined>,
): AuthEnvironment {
  return authEnvironmentSchema.parse(environment);
}

export function getAuthEnvironment(): AuthEnvironment {
  return parseAuthEnvironment(process.env);
}
