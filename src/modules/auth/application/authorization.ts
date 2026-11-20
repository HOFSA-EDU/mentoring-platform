import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  assertMentorCanAccessStudent,
  assertStudentOwnsProfile,
} from "@/modules/auth/domain/authorization-policy";
import { prismaStudentAccessPolicyRepository } from "@/modules/auth/infrastructure/prisma-student-access-policy-repository";
import {
  getRoleAccessDecision,
  homePathForRole,
} from "@/modules/auth/domain/route-access";
import {
  userRoleSchema,
  type UserRole,
} from "@/modules/identity/domain/role";

export type AuthorizedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export const getCurrentUser = cache(async (): Promise<AuthorizedUser | null> => {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  const role = userRoleSchema.safeParse(user?.role);

  if (!user?.active || !role.success) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: role.data,
  };
});

export async function requireUser(): Promise<AuthorizedUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(role: UserRole): Promise<AuthorizedUser> {
  const user = await getCurrentUser();
  const decision = getRoleAccessDecision(user?.role ?? null, role);

  if (!decision.allowed) {
    redirect(decision.redirectTo);
  }

  return user as AuthorizedUser;
}

export function requireStudent(): Promise<AuthorizedUser> {
  return requireRole("STUDENT");
}

export function requireMentor(): Promise<AuthorizedUser> {
  return requireRole("MENTOR");
}

export function requireAdmin(): Promise<AuthorizedUser> {
  return requireRole("ADMIN");
}

export async function redirectToRoleHome(): Promise<never> {
  const user = await requireUser();
  redirect(homePathForRole(user.role));
}

export async function requireMentorAccessToStudent(
  studentProfileId: string,
): Promise<AuthorizedUser> {
  const mentor = await requireMentor();
  await assertMentorCanAccessStudent(
    mentor.id,
    studentProfileId,
    prismaStudentAccessPolicyRepository,
  );
  return mentor;
}

export async function requireStudentProfileOwnership(
  studentProfileId: string,
): Promise<AuthorizedUser> {
  const student = await requireStudent();
  await assertStudentOwnsProfile(
    student.id,
    studentProfileId,
    prismaStudentAccessPolicyRepository,
  );
  return student;
}
