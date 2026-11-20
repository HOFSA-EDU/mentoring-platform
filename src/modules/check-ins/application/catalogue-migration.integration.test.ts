import { readFileSync } from "node:fs";
import { Client } from "pg";
import { expect, it } from "vitest";

it("migrates historical booleans losslessly and preserves snapshots and constraints", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const schema = `catalogue_migration_${process.pid}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TABLE "QuestionOption" ("directionValue" INTEGER NOT NULL CHECK ("directionValue" BETWEEN 0 AND 3));
      CREATE TABLE "CheckInAnswer" ("directionValueSnapshot" INTEGER NOT NULL CHECK ("directionValueSnapshot" BETWEEN 0 AND 3), "optionLabelSnapshot" TEXT);
      CREATE TABLE "CheckIn" (id TEXT, kind TEXT, "periodKey" TEXT, "wantsMentorConversation" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "CheckIn_period_kind_check" CHECK (
          (kind = 'ONBOARDING' AND "periodKey" = 'ONBOARDING' AND "wantsMentorConversation" = false)
          OR (kind = 'WEEKLY' AND "periodKey" ~ '^[0-9]{4}-W[0-9]{2}$')));
      INSERT INTO "CheckIn" VALUES ('yes', 'WEEKLY', '2026-W38', true), ('no', 'WEEKLY', '2026-W38', false), ('baseline', 'ONBOARDING', 'ONBOARDING', false);
      INSERT INTO "CheckInAnswer" VALUES (3, 'Historical answer'), (0, 'Historical zero');
    `);
    await client.query(readFileSync("prisma/migrations/20260917120000_question_catalogue/migration.sql", "utf8"));
    expect((await client.query('SELECT id, "mentorConversationRequest" FROM "CheckIn" ORDER BY id')).rows).toEqual([
      { id: "baseline", mentorConversationRequest: "NO" },
      { id: "no", mentorConversationRequest: "NO" },
      { id: "yes", mentorConversationRequest: "YES" },
    ]);
    expect((await client.query('SELECT * FROM "CheckInAnswer" ORDER BY "directionValueSnapshot"')).rows).toEqual([
      { directionValueSnapshot: 0, optionLabelSnapshot: "Historical zero" },
      { directionValueSnapshot: 3, optionLabelSnapshot: "Historical answer" },
    ]);
    await client.query('INSERT INTO "QuestionOption" VALUES (NULL)');
    await client.query('INSERT INTO "CheckInAnswer" VALUES (NULL, \'I am not sure.\')');
    await client.query(`INSERT INTO "CheckIn" VALUES ('maybe', 'WEEKLY', '2026-W39', 'MAYBE')`);
    await expect(client.query('INSERT INTO "QuestionOption" VALUES (4)')).rejects.toThrow();
    await expect(client.query(`INSERT INTO "CheckIn" VALUES ('invalid', 'ONBOARDING', 'ONBOARDING', 'MAYBE')`)).rejects.toThrow();
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
