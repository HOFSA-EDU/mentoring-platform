import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { getLuxembourgPeriodKey } from "../../src/modules/check-ins/domain/period";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prefix = "phase06-e2e";
const cases = [
  { key: "repeated", name: "Observation Repeated", values: [3, 3, 3], signal: "NO" },
  { key: "worsening", name: "Observation Worsening", values: [0, 1, 3], signal: "NO" },
  { key: "improvement", name: "Observation Improvement", values: [3, 2, 1], signal: "NO" },
  { key: "conversation", name: "Observation Conversation", values: [null, null, null], signal: "YES" },
  { key: "maybe", name: "Observation Maybe", values: [null, null, null], signal: "MAYBE" },
  { key: "quiet", name: "Observation Quiet", values: [null, null, null], signal: "NO" },
  { key: "private", name: "Observation Private", values: [3, 3, 3], signal: "NO" },
];
const ids = cases.map(({ key }) => `${prefix}-${key}`);
const questionId = `${prefix}-question`;
const originalQuestion = "How often did you start a planned task later than intended?";
const repeatedTitle = "Getting started: Repeated reported difficulty";
const studentUrl = `/mentor/students/${ids[0]}`;

test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

async function cleanup() {
  await pool.query(`DELETE FROM "AuditEvent" WHERE "actorUserId" = ANY($1::text[])
    OR "entityId" IN (SELECT "id" FROM "Observation" WHERE "studentId" = ANY($1::text[]))`, [ids]);
  await pool.query('DELETE FROM "Observation" WHERE "studentId" = ANY($1::text[])', [ids]);
  await pool.query('DELETE FROM "CheckIn" WHERE "studentId" = ANY($1::text[])', [ids]);
  await pool.query('DELETE FROM "MentorAssignment" WHERE "studentId" = ANY($1::text[])', [ids]);
  await pool.query('DELETE FROM "User" WHERE "id" = ANY($1::text[])', [ids]);
  await pool.query('DELETE FROM "Question" WHERE "id" = $1', [questionId]);
}
test.beforeEach(async () => {
  await cleanup();
  await pool.query(`INSERT INTO "Question" ("id", "key", "text", "domain", "type", "context", "stable", "active", "sortOrder", "updatedAt")
    VALUES ($1, 'PHASE06_E2E_SNAPSHOT', $2, 'WORK_START', 'SINGLE_CHOICE', 'WEEKLY', true, false, 9999, now())`, [questionId, originalQuestion]);
  const now = new Date();
  for (const [index, scenario] of cases.entries()) {
    const id = ids[index];
    await pool.query(`INSERT INTO "User" ("id", "email", "name", "role", "passwordHash", "updatedAt")
      SELECT $1, $2, $3, 'STUDENT', "passwordHash", now() FROM "User" WHERE "id" = 'user-student-001'`, [id, `${id}@example.test`, scenario.name]);
    await pool.query(`INSERT INTO "StudentProfile" ("id", "userId", "semesterId", "updatedAt")
      SELECT $1, $1, "semesterId", now() FROM "StudentProfile" WHERE "userId" = 'user-student-001'`, [id]);
    await pool.query('INSERT INTO "MentorAssignment" ("id", "studentId", "mentorId") VALUES ($1, $2, $3)',
      [`${id}-assignment`, id, scenario.key === "private" ? "mentor-profile-002" : "mentor-profile-001"]);
    for (const [week, value] of scenario.values.entries()) {
      const date = new Date(now.getTime() - (2 - week) * 7 * 86_400_000);
      const checkInId = `${id}-${week}`;
      await pool.query(`INSERT INTO "CheckIn" ("id", "studentId", "semesterId", "kind", "periodKey", "submittedAt", "mentorConversationRequest")
        SELECT $1, "id", "semesterId", 'WEEKLY', $3, $4, $5::"MentorConversationRequest" FROM "StudentProfile" WHERE "id" = $2`,
      [checkInId, id, getLuxembourgPeriodKey(date), date.toISOString(), week === 2 ? scenario.signal : "NO"]);
      await pool.query(`INSERT INTO "CheckInAnswer" ("id", "checkInId", "questionId", "selectedOptionId", "questionTextSnapshot", "optionLabelSnapshot",
        "directionValueSnapshot", "sortOrder", "domainSnapshot", "stableSnapshot", "questionSignatureSnapshot")
        VALUES ($1, $2, $3, 'historical-option', $4, $5, $6, 1, 'WORK_START', true, $7)`,
      [`${checkInId}-answer`, checkInId, questionId, originalQuestion, value === null ? "I am not sure." : ["Never.", "Once.", "Several times.", "Very often."][value], value, "a".repeat(64)]);
    }
  }
});
test.afterAll(async () => { await cleanup(); await pool.end(); });

async function signIn(page: Page, email = "mentor1@example.test", home = "mentor") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MentoringDev!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${home}$`));
}
async function openRepeated(page: Page) {
  await page.goto(studentUrl);
  await page.getByRole("link", { name: `Open Observation: ${repeatedTitle}`, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: repeatedTitle, exact: true })).toBeVisible();
}

test("prioritizes formal evidence, keeps improvement calm, and acknowledges then resolves with immutable evidence", async ({ page }, testInfo) => {
  await signIn(page);
  const attention = page.getByRole("region", { name: "Needs attention", exact: true });
  await expect(attention.getByRole("heading", { level: 3 })).toHaveText([
    "Observation Conversation", "Observation Repeated", "Observation Worsening", "Observation Maybe",
  ]);
  await expect(attention.getByText("Observation Improvement", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Observation Private", { exact: true })).toHaveCount(0);
  const improving = page.getByRole("region", { name: "All assigned students", exact: true }).locator("li").filter({ has: page.getByRole("heading", { name: "Observation Improvement", exact: true }) });
  await expect(improving).toContainText("Consistent reported improvement");
  await expect(improving).not.toContainText("Watch");
  await page.screenshot({ path: testInfo.outputPath("observations-dashboard.png"), fullPage: true });
  await openRepeated(page);
  const evidence = page.getByRole("region", { name: "Why this Observation exists", exact: true });
  await expect(evidence.getByText(originalQuestion, { exact: true })).toHaveCount(3);
  await expect(evidence.getByText("Very often.", { exact: true })).toHaveCount(3);
  await expect(page.locator("main")).not.toContainText(/directionValue|risk score|risk probability|questionSignature|dropout/i);
  await pool.query('UPDATE "Question" SET "text" = \'Changed afterwards\', "domain" = \'HELP_SEEKING\' WHERE "id" = $1', [questionId]);
  await page.reload();
  await expect(evidence.getByText(originalQuestion, { exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(page.locator('header [data-slot="badge"]').getByText("Acknowledged", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Acknowledge", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.locator('header [data-slot="badge"]').getByText("Resolved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolve", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(evidence.getByText(originalQuestion, { exact: true })).toHaveCount(3);
  await page.goto("/mentor");
  await expect(attention.getByText("Observation Repeated", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "All assigned students", exact: true }).getByText("Observation Repeated", { exact: true })).toBeVisible();
});

test("rejects unassigned direct URLs and forged actions, including revocation in an existing session", async ({ page, browser }) => {
  await signIn(page);
  const context = await browser.newContext();
  let privateId: string;
  try {
    const other = await context.newPage();
    await signIn(other, "mentor2@example.test");
    const result = await pool.query('SELECT "id" FROM "Observation" WHERE "studentId" = $1', [ids[6]]);
    privateId = result.rows[0].id;
  } finally { await context.close(); }
  await page.goto(`/mentor/students/${ids[6]}/observations/${privateId!}`);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText(originalQuestion, { exact: true })).toHaveCount(0);
  await openRepeated(page);
  await page.locator('input[name="studentId"]').evaluate((element, value) => { (element as HTMLInputElement).value = value; }, ids[6]);
  await page.locator('input[name="observationId"]').evaluate((element, value) => { (element as HTMLInputElement).value = value; }, privateId!);
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This Observation is no longer available to you.");
  expect((await pool.query('SELECT "status" FROM "Observation" WHERE "id" = $1', [privateId!])).rows[0].status).toBe("OPEN");
  await openRepeated(page);
  await pool.query('UPDATE "MentorAssignment" SET "active" = false, "deactivatedAt" = now() WHERE "studentId" = $1', [ids[0]]);
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This Observation is no longer available to you.");
  await page.reload();
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});

test("does not expose formal Observations to Students, Admins or anonymous requests", async ({ page, browser }) => {
  await signIn(page);
  await openRepeated(page);
  const url = page.url();
  for (const [email, home] of [["", "login"], ["admin@example.test", "admin"], [`${ids[0]}@example.test`, "student"]]) {
    const context = await browser.newContext();
    try {
      const other = await context.newPage();
      if (email) await signIn(other, email, home);
      await other.goto(url);
      await expect(other).toHaveURL(new RegExp(`/${home}$`));
      await expect(other.getByText(repeatedTitle, { exact: true })).toHaveCount(0);
    } finally { await context.close(); }
  }
});

test("supports mobile evidence at 320, 375 and 390px and keyboard lifecycle actions", async ({ page }, testInfo) => {
  await signIn(page);
  await openRepeated(page);
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Observation evidence overflows at ${width}px`).toBe(true);
    expect((await page.getByRole("button", { name: "Acknowledge", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (width === 375) await page.screenshot({ path: testInfo.outputPath("observation-evidence-mobile.png"), fullPage: true });
  }
  await page.getByRole("button", { name: "Acknowledge", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('header [data-slot="badge"]').getByText("Acknowledged", { exact: true })).toBeVisible();
});
