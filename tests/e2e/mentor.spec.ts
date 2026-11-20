import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";
import { getLuxembourgPeriodKey } from "../../src/modules/check-ins/domain/period";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prefix = "phase05-e2e";
const studentIds = ["yes", "maybe", "change", "none", "unassigned"].map((id) => `${prefix}-${id}`);
const names = ["Zoe Conversation", "Maya Maybe", "Casey Change", "Alex Quiet", "Private Unassigned"];
const emptyMentor = `${prefix}-empty-mentor`;
const questionId = `${prefix}-question`;
const questionText = "How often did you delay starting your planned task?";
const negativeText = "The student reported more difficulty with getting started in recent comparable Check-ins.";
const detailUrl = `/mentor/students/${studentIds[0]}`;
const historyUrl = `${detailUrl}/check-ins/${studentIds[0]}-current`;

test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

async function cleanup() {
  await pool.query('DELETE FROM "AuditEvent" WHERE "actorUserId" = ANY($1::text[])', [studentIds]);
  await pool.query('DELETE FROM "Observation" WHERE "studentId" = ANY($1::text[])', [studentIds]);
  await pool.query('DELETE FROM "MentorAssignment" WHERE "studentId" = ANY($1::text[])', [studentIds]);
  await pool.query('DELETE FROM "CheckIn" WHERE "studentId" = ANY($1::text[])', [studentIds]);
  await pool.query('DELETE FROM "User" WHERE "id" = ANY($1::text[])', [[...studentIds, emptyMentor]]);
  await pool.query('DELETE FROM "Question" WHERE "id" = $1', [questionId]);
}

test.beforeEach(async () => {
  await cleanup();
  await pool.query(`INSERT INTO "Question" ("id", "key", "text", "domain", "type", "context", "stable", "active", "sortOrder", "updatedAt")
    VALUES ($1, 'PHASE05_E2E_SNAPSHOT', $2, 'WORK_START', 'SINGLE_CHOICE', 'WEEKLY', true, false, 9900, now())`, [questionId, questionText]);
  await pool.query(`INSERT INTO "User" ("id", "email", "name", "role", "passwordHash", "updatedAt")
    SELECT $1, $2, 'Mentor Without Assignments', 'MENTOR', "passwordHash", now() FROM "User" WHERE "id" = 'user-mentor-001'`,
  [emptyMentor, `${emptyMentor}@example.test`]);
  await pool.query(`INSERT INTO "MentorProfile" ("id", "userId", "updatedAt") VALUES ($1, $1, now())`, [emptyMentor]);
  const currentDate = new Date();
  const previousDate = new Date(currentDate.getTime() - 7 * 86_400_000);
  for (const [index, id] of studentIds.entries()) {
    await pool.query(`INSERT INTO "User" ("id", "email", "name", "role", "passwordHash", "updatedAt")
      SELECT $1, $2, $3, 'STUDENT', "passwordHash", now() FROM "User" WHERE "id" = 'user-student-001'`,
    [id, `${id}@example.test`, names[index]]);
    await pool.query(`INSERT INTO "StudentProfile" ("id", "userId", "semesterId", "updatedAt")
      SELECT $1, $1, "semesterId", now() FROM "StudentProfile" WHERE "userId" = 'user-student-001'`, [id]);
    await pool.query(`INSERT INTO "MentorAssignment" ("id", "studentId", "mentorId") VALUES ($1, $2, $3)`,
    [`${id}-assignment`, id, index === 4 ? "mentor-profile-002" : "mentor-profile-001"]);
    if (index === 3) continue; // No weekly data or onboarding: explicit empty state.
    for (const kind of ["baseline", "previous", "current"] as const) {
      const date = kind === "current" ? currentDate : previousDate;
      const signal = kind === "current" ? index === 0 ? "YES" : index === 1 ? "MAYBE" : "NO" : "NO";
      const value = kind === "current" && index === 2 ? 3 : 1;
      const checkInId = `${id}-${kind}`;
      await pool.query(`INSERT INTO "CheckIn" ("id", "studentId", "semesterId", "kind", "periodKey", "submittedAt", "mentorConversationRequest")
        SELECT $1, "id", "semesterId", $3::"CheckInKind", $4, $5, $6::"MentorConversationRequest" FROM "StudentProfile" WHERE "id" = $2`,
      [checkInId, id, kind === "baseline" ? "ONBOARDING" : "WEEKLY", kind === "baseline" ? "ONBOARDING" : getLuxembourgPeriodKey(date), date.toISOString(), signal]);
      await pool.query(`INSERT INTO "CheckInAnswer" ("id", "checkInId", "questionId", "selectedOptionId", "questionTextSnapshot", "optionLabelSnapshot",
        "directionValueSnapshot", "sortOrder", "domainSnapshot", "stableSnapshot", "questionSignatureSnapshot")
        VALUES ($1, $2, $3, 'historic-option', $4, $5, $6, 1, 'WORK_START', $7, $8)`,
      [`${checkInId}-answer`, checkInId, questionId, questionText, value === 3 ? "Several times." : "Once.", value, kind !== "baseline", "a".repeat(64)]);
    }
  }
});

test.afterAll(async () => { await cleanup(); await pool.end(); });

async function signIn(page: Page, email = "mentor1@example.test", role = "mentor") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MentoringDev!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}

test("shows assigned evidence in priority order and preserves historical snapshot text", async ({ page }, testInfo) => {
  await signIn(page);
  const attention = page.getByRole("region", { name: "Needs attention", exact: true });
  await expect(attention.getByRole("heading", { level: 3 })).toHaveText(names.slice(0, 2));
  await expect(attention.getByText("Would like to talk", { exact: true })).toBeVisible();
  await expect(attention.getByText("May benefit from a check-in", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "All assigned students", exact: true }).getByText(negativeText, { exact: true })).toBeVisible();
  await expect(page.getByText(names[4], { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "All assigned students", exact: true }).getByRole("link", { name: `View ${names[3]}` })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mentor-desktop.png"), fullPage: true });
  await page.getByRole("region", { name: "All assigned students", exact: true }).getByRole("link", { name: `View ${names[2]}` }).click();
  await expect(page.getByRole("heading", { name: names[2], level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recent changes", exact: true }).getByText(negativeText)).toBeVisible();
  await expect(page.getByRole("region", { name: "Development areas", exact: true }).getByRole("heading", { level: 3 })).toHaveCount(6);
  await expect(page.getByRole("heading", { name: /Semester Journey/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Starting point" }).getByText("Once.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Open Check-in/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/mentor/students/${studentIds[2]}/check-ins/${studentIds[2]}-current$`));
  await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  await expect(page.getByText("Several times.", { exact: true })).toBeVisible();
  await expect(page.getByText("No conversation requested", { exact: true })).toBeVisible();
  await pool.query('UPDATE "Question" SET "text" = $1, "domain" = \'HELP_SEEKING\' WHERE "id" = $2', ["Revised wording after submission", questionId]);
  await page.reload();
  await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  await expect(page.getByText("Getting started", { exact: true })).toBeVisible();
  await expect(page.getByText("Revised wording after submission", { exact: true })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/directionValue|passwordHash|questionSignature|WORK_START/);
});

test("searches names and filters separate conversation responses and negative changes using keyboard", async ({ page }) => {
  await signIn(page);
  await page.goto("/mentor/students");
  await page.getByLabel("Search by name").fill("maya");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  const results = page.getByRole("region", { name: "Assigned student results" });
  await expect(results.getByRole("heading", { level: 3 })).toHaveText([names[1]]);
  await page.getByRole("link", { name: "Reset", exact: true }).click();
  await expect(page).toHaveURL(/\/mentor\/students$/);
  const filter = page.getByRole("combobox", { name: "Recent conversation response" });
  await filter.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(filter).toContainText("Maybe — conversation might help");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(results.getByRole("heading", { level: 3 })).toHaveText([names[1]]);
  await page.goto("/mentor/students?signal=YES");
  await expect(results.getByRole("heading", { level: 3 })).toHaveText([names[0]]);
  await page.goto("/mentor/students?signal=NO&change=MORE_DIFFICULT");
  await expect(results.getByRole("heading", { level: 3 })).toHaveText([names[2]]);
  await page.getByLabel("Search by name").fill("does not exist");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("No matching students", { exact: true })).toBeVisible();
});

test("blocks direct unassigned history and rechecks assignment changes without a new login", async ({ page }) => {
  await signIn(page);
  for (const path of [`/mentor/students/${studentIds[4]}`, `/mentor/students/${studentIds[4]}/check-ins/${studentIds[4]}-current`, `${detailUrl}/check-ins/${studentIds[1]}-current`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText(questionText, { exact: true })).toHaveCount(0);
  }
  await page.goto(historyUrl);
  await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  await pool.query('UPDATE "MentorAssignment" SET "active" = false, "deactivatedAt" = now() WHERE "studentId" = $1', [studentIds[0]]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.goto(detailUrl);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.goto("/mentor");
  await expect(page.getByText(names[0], { exact: true })).toHaveCount(0);
});

test("shows calm empty states for a new student and a mentor without assignments", async ({ page, browser }) => {
  await signIn(page);
  await page.goto(`/mentor/students/${studentIds[3]}`);
  await expect(page.getByText("No weekly Check-ins yet", { exact: true })).toBeVisible();
  await expect(page.getByText("Not enough data", { exact: true })).toHaveCount(6);
  await expect(page.getByText("Onboarding has not been completed yet.", { exact: true })).toBeVisible();
  const context = await browser.newContext();
  try {
    const emptyPage = await context.newPage();
    await signIn(emptyPage, `${emptyMentor}@example.test`);
    await expect(emptyPage.getByRole("region", { name: "Needs attention" }).getByText("No assigned students yet")).toBeVisible();
    await emptyPage.goto("/mentor/students");
    await expect(emptyPage.getByText("No assigned students yet", { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("keeps every mentor screen readable at 320, 375 and 390px with keyboard navigation", async ({ page }, testInfo) => {
  await signIn(page);
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [name, path] of [["dashboard", "/mentor"], ["list", "/mentor/students?signal=MAYBE"], ["detail", detailUrl], ["history", historyUrl]]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name} overflows at ${width}px`).toBe(true);
      if (width === 375) await page.screenshot({ path: testInfo.outputPath(`mentor-mobile-${name}.png`), fullPage: true });
    }
  }
  await page.goto("/mentor");
  const firstStudent = page.locator("main a").first();
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press("Tab");
    if (await firstStudent.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(firstStudent).toBeFocused();
  expect((await firstStudent.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${detailUrl}$`));
});
