import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { getLuxembourgPeriodKey } from "../../src/modules/check-ins/domain/period";
import { mentoringLocalTime } from "../../src/modules/mentoring/domain/calendar";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const studentId = "phase07-e2e-student";
const questionId = "phase07-e2e-question";
const studentUrl = `/mentor/students/${studentId}`;
const formUrl = `${studentUrl}/mentoring/new`;
const privateNote = "PRIVATE-ONLY: discuss a manageable first step.";
const internalNote = "INTERNAL-ONLY: revisit whether the strategy helped.";
const agreement = "Start one assignment by identifying its first concrete step before Friday.";
const requestTitle = "Student requested a mentor conversation";
const difficultyTitle = "Getting started: Repeated reported difficulty";
test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

async function cleanup() {
  await pool.query(`DELETE FROM "AuditEvent" WHERE "actorUserId" = $1 OR "entityId" IN (
    SELECT "id" FROM "Observation" WHERE "studentId" = $1 UNION SELECT "id" FROM "MentoringConversation" WHERE "studentId" = $1
    UNION SELECT "id" FROM "FollowUp" WHERE "studentId" = $1 UNION SELECT a."id" FROM "SharedAgreement" a JOIN "MentoringConversation" c ON c."id" = a."conversationId" WHERE c."studentId" = $1)`, [studentId]);
  await pool.query('DELETE FROM "FollowUp" WHERE "studentId" = $1', [studentId]);
  await pool.query('DELETE FROM "MentoringConversationObservation" WHERE "studentId" = $1', [studentId]);
  await pool.query('DELETE FROM "SharedAgreement" WHERE "conversationId" IN (SELECT "id" FROM "MentoringConversation" WHERE "studentId" = $1)', [studentId]);
  await pool.query('DELETE FROM "MentoringConversation" WHERE "studentId" = $1', [studentId]);
  await pool.query('DELETE FROM "Observation" WHERE "studentId" = $1', [studentId]);
  await pool.query('DELETE FROM "CheckIn" WHERE "studentId" = $1', [studentId]);
  await pool.query('DELETE FROM "MentorAssignment" WHERE "studentId" = $1', [studentId]);
  await pool.query('DELETE FROM "User" WHERE "id" = $1', [studentId]);
  await pool.query('DELETE FROM "Question" WHERE "id" = $1', [questionId]);
}
test.beforeEach(async () => {
  await cleanup();
  await pool.query(`INSERT INTO "User" ("id", "email", "name", "role", "passwordHash", "updatedAt")
    SELECT $1, $2, 'Mentoring Student', 'STUDENT', "passwordHash", now() FROM "User" WHERE "id" = 'user-student-001'`, [studentId, `${studentId}@example.test`]);
  await pool.query(`INSERT INTO "StudentProfile" ("id", "userId", "semesterId", "updatedAt") SELECT $1, $1, "semesterId", now() FROM "StudentProfile" WHERE "userId" = 'user-student-001'`, [studentId]);
  await pool.query(`INSERT INTO "MentorAssignment" ("id", "studentId", "mentorId") VALUES ($1, $2, 'mentor-profile-001')`, [`${studentId}-assignment`, studentId]);
  await pool.query(`INSERT INTO "Question" ("id", "key", "text", "domain", "type", "context", "stable", "active", "sortOrder", "updatedAt")
    VALUES ($1, 'PHASE07_E2E', 'Starting an assignment?', 'WORK_START', 'SINGLE_CHOICE', 'WEEKLY', true, false, 9999, now())`, [questionId]);
  for (let week = 0; week < 3; week++) {
    const date = new Date(Date.now() - (2 - week) * 7 * 86_400_000 - 3_600_000);
    const id = `${studentId}-${week}`;
    await pool.query(`INSERT INTO "CheckIn" ("id", "studentId", "semesterId", "kind", "periodKey", "submittedAt", "mentorConversationRequest")
      SELECT $1, "id", "semesterId", 'WEEKLY', $3, $4, $5::"MentorConversationRequest" FROM "StudentProfile" WHERE "id" = $2`, [id, studentId, getLuxembourgPeriodKey(date), date.toISOString(), week === 2 ? "YES" : "NO"]);
    await pool.query(`INSERT INTO "CheckInAnswer" ("id", "checkInId", "questionId", "selectedOptionId", "questionTextSnapshot", "optionLabelSnapshot", "directionValueSnapshot", "sortOrder", "domainSnapshot", "stableSnapshot", "questionSignatureSnapshot")
      VALUES ($1, $2, $3, 'historical-option', 'Starting an assignment?', 'Several times.', 3, 1, 'WORK_START', true, $4)`, [`${id}-answer`, id, questionId, "a".repeat(64)]);
  }
});
test.afterAll(async () => { await cleanup(); await pool.end(); });

async function signIn(page: Page, email = "mentor1@example.test", home = "mentor") {
  await page.goto("/login"); await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("MentoringDev!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/${home}$`));
}
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).click(); await page.getByRole("menuitem", { name: "Sign out" }).click(); await expect(page).toHaveURL(/\/login$/);
}
async function fillConversation(page: Page) {
  await page.getByLabel("Topic", { exact: true }).fill("Getting started with an assignment");
  await page.getByLabel("Private mentor note", { exact: true }).fill(privateNote);
  await page.getByLabel("Shared agreement", { exact: true }).fill(agreement);
  await page.getByLabel("Follow-up date", { exact: true }).fill(mentoringLocalTime(new Date()).slice(0, 10));
  await page.getByLabel("Internal follow-up note", { exact: true }).fill(internalNote);
}

test("records a linked conversation, shares only the agreement, and completes its retained follow-up", async ({ page }, testInfo) => {
  await signIn(page); await page.goto(studentUrl);
  await page.getByRole("link", { name: `Open Observation: ${requestTitle}`, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: requestTitle, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Record conversation", exact: true }).click();
  await expect(page).toHaveURL(/\/mentoring\/new\?observation=/);
  await expect(page.getByRole("button", { name: `${requestTitle} · Open`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: `${difficultyTitle} · Open`, exact: true }).click();
  await fillConversation(page);
  await page.getByRole("button", { name: "Save conversation", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${studentUrl}#mentoring$`));
  const history = page.getByRole("region", { name: "Mentoring", exact: true });
  await expect(history.getByText(privateNote, { exact: true })).toBeVisible();
  await expect(history.getByText(agreement, { exact: true })).toBeVisible();
  await expect(history.getByText(internalNote, { exact: true })).toBeVisible();
  await expect(history.getByRole("link", { name: `${requestTitle} · Resolved`, exact: true })).toBeVisible();
  await expect(history.getByRole("link", { name: `${difficultyTitle} · Open`, exact: true })).toBeVisible();
  await page.goto("/mentor");
  const reminders = page.getByRole("region", { name: "Due follow-ups", exact: true });
  await expect(reminders.getByText(internalNote, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mentoring-dashboard.png"), fullPage: true, caret: "initial" });
  await signOut(page); await signIn(page, `${studentId}@example.test`, "student");
  await expect(page.getByRole("region", { name: "Agreed with your Mentor" }).getByText(agreement, { exact: true })).toBeVisible();
  for (const url of ["/student", "/student/mentoring"]) {
    const response = await page.goto(url);
    const html = await response!.text();
    expect(html).not.toContain(privateNote); expect(html).not.toContain(internalNote);
    expect(html).not.toContain('"privateNote"');
    await expect(page.locator("main")).not.toContainText(/Private mentor note|Internal follow-up|Repeated reported difficulty/);
    await expect(page.getByText(agreement, { exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 375, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("student-agreement-mobile.png"), fullPage: true, caret: "initial" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await signOut(page); await signIn(page);
  await page.goto("/mentor/follow-ups");
  await page.getByRole("button", { name: "Complete follow-up", exact: true }).click();
  await expect(page.getByText("No open follow-ups.", { exact: true })).toBeVisible();
  await page.goto(studentUrl);
  await expect(history.getByText("Completed", { exact: true })).toBeVisible();
  await expect(history.getByText(internalNote, { exact: true })).toBeVisible();
  const result = await pool.query('SELECT "status" FROM "FollowUp" WHERE "studentId" = $1', [studentId]);
  expect(result.rows).toEqual([{ status: "COMPLETED" }]);
});

test("denies direct private routes to other roles and unassigned Mentors", async ({ page, browser }) => {
  await signIn(page); await page.goto(formUrl); await fillConversation(page);
  await page.getByRole("button", { name: "Save conversation", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${studentUrl}#mentoring$`));
  for (const [email, home] of [["mentor2@example.test", "mentor"], [`${studentId}@example.test`, "student"], ["admin@example.test", "admin"], ["", "login"]]) {
    const context = await browser.newContext();
    try {
      const other = await context.newPage(); if (email) await signIn(other, email, home);
      for (const path of [studentUrl, formUrl]) {
        const response = await other.goto(path);
        if (email === "mentor2@example.test") await expect(other.getByRole("heading", { name: "404" })).toBeVisible();
        else await expect(other).toHaveURL(new RegExp(`/${home}$`));
        const html = await response!.text(); expect(html).not.toContain(privateNote); expect(html).not.toContain(internalNote);
      }
      await other.goto("/mentor/follow-ups");
      if (email === "mentor2@example.test") await expect(other.getByText(internalNote, { exact: true })).toHaveCount(0);
      else await expect(other).toHaveURL(new RegExp(`/${home}$`));
    } finally { await context.close(); }
  }
});

test("rejects forged students and revoked assignments in existing forms", async ({ page }) => {
  await signIn(page); await page.goto(formUrl); await fillConversation(page);
  await page.locator('input[name="studentId"]').evaluate((element) => { (element as HTMLInputElement).value = "student-profile-005"; });
  await page.getByRole("button", { name: "Save conversation", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This mentoring record is no longer available to you.");
  await expect(page.getByLabel("Private mentor note", { exact: true })).toHaveValue(privateNote);
  await page.goto(formUrl); await fillConversation(page);
  await pool.query('UPDATE "MentorAssignment" SET "active" = false, "deactivatedAt" = now() WHERE "studentId" = $1', [studentId]);
  await page.getByRole("button", { name: "Save conversation", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This mentoring record is no longer available to you.");
  expect((await pool.query('SELECT count(*)::int AS count FROM "MentoringConversation" WHERE "studentId" = $1', [studentId])).rows[0].count).toBe(0);
  await page.reload(); await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});

test("supports mobile recording and keyboard cancellation without deleting history", async ({ page }, testInfo) => {
  await signIn(page); await page.goto(formUrl);
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Conversation form overflows at ${width}px`).toBe(true);
    expect((await page.getByRole("button", { name: "Save conversation", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await fillConversation(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("mentoring-form-mobile.png"), fullPage: true, caret: "initial" });
  const save = page.getByRole("button", { name: "Save conversation", exact: true }); await save.focus(); await save.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${studentUrl}#mentoring$`));
  await page.goto("/mentor/follow-ups");
  const cancel = page.getByRole("button", { name: "Cancel follow-up", exact: true }); await cancel.focus(); await cancel.press("Enter");
  await expect(page.getByText("No open follow-ups.", { exact: true })).toBeVisible();
  await page.goto(studentUrl); await expect(page.getByRole("region", { name: "Mentoring", exact: true }).getByText("Cancelled", { exact: true })).toBeVisible();
});
