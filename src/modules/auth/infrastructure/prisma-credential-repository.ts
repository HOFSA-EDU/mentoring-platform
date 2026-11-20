import { prisma } from "@/lib/prisma";
import type { CredentialRepository } from "@/modules/auth/application/credentials";

export const prismaCredentialRepository: CredentialRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        active: true,
      },
    });
  },
};
