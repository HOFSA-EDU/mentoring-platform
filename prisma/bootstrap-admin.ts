import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { parseDatabaseEnvironment } from "../src/lib/env";
import { initialPasswordSchema } from "../src/modules/admin/domain/schemas";
import { hashPassword } from "../src/modules/auth/infrastructure/password";

const bootstrapEnvironmentSchema = z.object({
  BOOTSTRAP_ADMIN_EMAIL: z
    .string()
    .trim()
    .email("Enter a valid administrator email address.")
    .max(254)
    .transform((email) => email.toLowerCase()),
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(2).max(100),
  BOOTSTRAP_ADMIN_PASSWORD: initialPasswordSchema.refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must contain at most 72 UTF-8 bytes; bcrypt truncates longer passwords.",
  ),
});

class BootstrapError extends Error {}

async function main() {
  const input = bootstrapEnvironmentSchema.parse(process.env);
  const { DATABASE_URL } = parseDatabaseEnvironment(process.env);
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({
      where: { email: input.BOOTSTRAP_ADMIN_EMAIL },
      select: { role: true, active: true },
    });

    if (existing) {
      if (existing.role !== UserRole.ADMIN || !existing.active) {
        throw new BootstrapError(
          "This email already belongs to an inactive account or a non-administrator. No changes were made.",
        );
      }

      console.info(
        "An active administrator with this email already exists. Name and password were left unchanged.",
      );
      return;
    }

    await prisma.user.create({
      data: {
        email: input.BOOTSTRAP_ADMIN_EMAIL,
        name: input.BOOTSTRAP_ADMIN_NAME,
        passwordHash: await hashPassword(input.BOOTSTRAP_ADMIN_PASSWORD),
        role: UserRole.ADMIN,
        active: true,
      },
    });

    console.info("Administrator created. Sign in using the supplied credentials.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof z.ZodError) {
    for (const issue of error.issues) {
      console.error(`${issue.path.join(".")}: ${issue.message}`);
    }
  } else if (error instanceof BootstrapError) {
    console.error(error.message);
  } else {
    // Database errors can include connection details. Do not log raw errors here.
    console.error(
      "Administrator bootstrap failed. Check database connectivity and applied migrations, then retry.",
    );
  }

  process.exitCode = 1;
});
