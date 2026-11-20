import { describe, expect, it } from "vitest";

import type { UserRole } from "@/modules/identity/domain/role";

import { getRoleAccessDecision } from "./route-access";

const roles: UserRole[] = ["STUDENT", "MENTOR", "ADMIN"];

describe("getRoleAccessDecision", () => {
  it.each(roles)("redirects unauthenticated %s routes to login", (required) => {
    expect(getRoleAccessDecision(null, required)).toEqual({
      allowed: false,
      redirectTo: "/login",
    });
  });

  it.each(roles)("allows %s users into their own workspace", (role) => {
    expect(getRoleAccessDecision(role, role)).toEqual({ allowed: true });
  });

  it.each([
    ["STUDENT", "MENTOR", "/student"],
    ["STUDENT", "ADMIN", "/student"],
    ["MENTOR", "STUDENT", "/mentor"],
    ["MENTOR", "ADMIN", "/mentor"],
    ["ADMIN", "STUDENT", "/admin"],
    ["ADMIN", "MENTOR", "/admin"],
  ] satisfies Array<[UserRole, UserRole, string]>) (
    "redirects %s users away from %s routes",
    (current, required, redirectTo) => {
      expect(getRoleAccessDecision(current, required)).toEqual({
        allowed: false,
        redirectTo,
      });
    },
  );
});
