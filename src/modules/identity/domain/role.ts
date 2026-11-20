import { z } from "zod";

export const userRoleSchema = z.enum(["STUDENT", "MENTOR", "ADMIN"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const roleLabels: Record<UserRole, string> = {
  STUDENT: "Student",
  MENTOR: "Mentor",
  ADMIN: "Administrator",
};
