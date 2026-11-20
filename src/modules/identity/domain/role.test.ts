import { describe, expect, it } from "vitest";

import { roleLabels, userRoleSchema } from "./role";

describe("userRoleSchema", () => {
  it("accepts only the three platform roles", () => {
    expect(userRoleSchema.options).toEqual(["STUDENT", "MENTOR", "ADMIN"]);
    expect(userRoleSchema.safeParse("MENTOR").success).toBe(true);
    expect(userRoleSchema.safeParse("TEACHER").success).toBe(false);
    expect(roleLabels.STUDENT).toBe("Student");
  });
});
