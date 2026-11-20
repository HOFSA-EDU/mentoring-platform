import { describe, expect, it } from "vitest";

import {
  assertMentorCanAccessStudent,
  assertStudentOwnsProfile,
  AuthorizationError,
  type StudentAccessPolicyRepository,
} from "./authorization-policy";

function policyRepository({
  assigned = false,
  ownsProfile = false,
}: {
  assigned?: boolean;
  ownsProfile?: boolean;
}): StudentAccessPolicyRepository {
  return {
    hasActiveMentorAssignment: async () => assigned,
    studentOwnsProfile: async () => ownsProfile,
  };
}

describe("student access policies", () => {
  it("allows a mentor with an active assignment", async () => {
    await expect(
      assertMentorCanAccessStudent(
        "mentor-user-1",
        "student-profile-1",
        policyRepository({ assigned: true }),
      ),
    ).resolves.toBeUndefined();
  });

  it("denies a mentor without an active assignment", async () => {
    await expect(
      assertMentorCanAccessStudent(
        "mentor-user-1",
        "student-profile-2",
        policyRepository({ assigned: false }),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("allows only the student who owns the profile", async () => {
    await expect(
      assertStudentOwnsProfile(
        "student-user-1",
        "student-profile-1",
        policyRepository({ ownsProfile: true }),
      ),
    ).resolves.toBeUndefined();

    await expect(
      assertStudentOwnsProfile(
        "student-user-2",
        "student-profile-1",
        policyRepository({ ownsProfile: false }),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
