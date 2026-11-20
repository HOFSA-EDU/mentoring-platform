import { z } from "zod";

import type { UserRole } from "@/modules/identity/domain/role";
import { verifyPassword } from "@/modules/auth/infrastructure/password";

const DUMMY_PASSWORD_HASH =
  "$2b$12$JPuDCu4sZk4yjnxvdMbPAOWYsuOvWE/gOMZNrDfui9xCWm8oqoZPe";

export const loginCredentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Password is too long."),
});

export type SafeSessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type CredentialUserRecord = SafeSessionUser & {
  passwordHash: string;
  active: boolean;
};

export type CredentialRepository = {
  findByEmail(email: string): Promise<CredentialUserRecord | null>;
};

export async function verifyCredentials(
  input: unknown,
  repository: CredentialRepository,
): Promise<SafeSessionUser | null> {
  const parsed = loginCredentialsSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  const user = await repository.findByEmail(parsed.data.email);
  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user?.active || !passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
