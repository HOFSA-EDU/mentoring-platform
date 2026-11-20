import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  verifyCredentials,
  type CredentialRepository,
  type CredentialUserRecord,
} from "./credentials";
import { hashPassword } from "../infrastructure/password";

describe("verifyCredentials", () => {
  let user!: CredentialUserRecord;

  beforeAll(async () => {
    user = {
      id: "user-student-001",
      email: "student1@example.test",
      name: "Alex Martin",
      role: "STUDENT",
      passwordHash: await hashPassword("CorrectPassword!1"),
      active: true,
    };
  });

  function repositoryFor(
    record: CredentialUserRecord | null,
  ): CredentialRepository {
    return {
      findByEmail: vi.fn().mockResolvedValue(record),
    };
  }

  it("returns only safe session fields for valid credentials", async () => {
    const result = await verifyCredentials(
      {
        email: "  STUDENT1@EXAMPLE.TEST ",
        password: "CorrectPassword!1",
      },
      repositoryFor(user),
    );

    expect(result).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("active");
  });

  it.each([
    [
      "wrong password",
      { email: "student1@example.test", password: "WrongPassword!1" },
    ],
    ["unknown account", { email: "nobody@example.test", password: "AnyPassword!1" }],
    ["malformed input", { email: "not-an-email", password: "AnyPassword!1" }],
  ])("returns null for %s", async (_case, credentials) => {
    const record =
      credentials.email === "nobody@example.test" ? null : user;

    await expect(
      verifyCredentials(credentials, repositoryFor(record)),
    ).resolves.toBeNull();
  });

  it("rejects inactive accounts", async () => {
    await expect(
      verifyCredentials(
        { email: user.email, password: "CorrectPassword!1" },
        repositoryFor({ ...user, active: false }),
      ),
    ).resolves.toBeNull();
  });
});
