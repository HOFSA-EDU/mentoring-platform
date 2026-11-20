import { describe, expect, it } from "vitest";

import { parseAuthEnvironment, parseDatabaseEnvironment } from "./env";

describe("parseDatabaseEnvironment", () => {
  it("accepts a PostgreSQL connection string", () => {
    expect(
      parseDatabaseEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      }),
    ).toEqual({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
    });
  });

  it("rejects a non-PostgreSQL URL", () => {
    expect(() =>
      parseDatabaseEnvironment({ DATABASE_URL: "https://example.test" }),
    ).toThrow();
  });
});

describe("parseAuthEnvironment", () => {
  it("accepts a secret with sufficient entropy capacity", () => {
    expect(
      parseAuthEnvironment({
        AUTH_SECRET: "a-development-secret-that-is-long-enough",
      }),
    ).toEqual({
      AUTH_SECRET: "a-development-secret-that-is-long-enough",
    });
  });

  it("rejects a short secret", () => {
    expect(() => parseAuthEnvironment({ AUTH_SECRET: "too-short" })).toThrow();
  });
});
