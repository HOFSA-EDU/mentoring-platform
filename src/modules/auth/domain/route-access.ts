import type { UserRole } from "@/modules/identity/domain/role";

export const roleHomePaths: Record<UserRole, string> = {
  STUDENT: "/student",
  MENTOR: "/mentor",
  ADMIN: "/admin",
};

export type RoleAccessDecision =
  | { allowed: true }
  | { allowed: false; redirectTo: string };

export function homePathForRole(role: UserRole): string {
  return roleHomePaths[role];
}

export function getRoleAccessDecision(
  currentRole: UserRole | null,
  requiredRole: UserRole,
): RoleAccessDecision {
  if (!currentRole) {
    return { allowed: false, redirectTo: "/login" };
  }

  if (currentRole !== requiredRole) {
    return { allowed: false, redirectTo: homePathForRole(currentRole) };
  }

  return { allowed: true };
}
