import "dotenv/config";

import { expect, test, type Page } from "@playwright/test";
import { Pool, type PoolClient } from "pg";

import { getLuxembourgPeriodKey } from "../../src/modules/check-ins/domain/period";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Journey E2E fixtures.");
}

const pool = new Pool({ connectionString: databaseUrl });
const prefix = "phase04-e2e-journey";
const studentIds = ["first", "second", "empty"].map((name) => `${prefix}-${name}`);
const questionIds = ["start", "track", "help"].map((name) => `${prefix}-${name}`);
const password = "MentoringDev!2026";
const questionText = "How often did you start a planned task later than intended this week?";
const revisedQuestionText = "Which first step helped you begin a task this week?";
const improvingText = "In your recent comparable Check-ins, you reported less difficulty with getting started with tasks.";
const moreDifficultText = "In your recent comparable Check-ins, you reported more difficulty with getting started with tasks.";
const notEnoughDataText = "There are not yet enough comparable weekly answers in this area. Your reflections will build over time.";
const signature = "a".repeat(64);
const weekMilliseconds = 7 * 86_400_000;
let currentDate: Date;
let previousDate: Date;

test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

async function cleanFixtures(client: PoolClient) {
  await client.query(
    `DELETE FROM "AuditEvent" WHERE "actorUserId" = ANY($1::text[])
     OR "entityId" = ANY($2::text[])
     OR "entityId" IN (SELECT "id" FROM "CheckIn" WHERE "studentId" = ANY($1::text[]))`,
    [studentIds, questionIds],
  );
  await client.query(`DELETE FROM "CheckIn" WHERE "studentId" = ANY($1::text[])`, [studentIds]);
  await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [studentIds]);
  await client.query(`DELETE FROM "Question" WHERE "id" = ANY($1::text[])`, [questionIds]);
}

async function insertOnboarding(client: PoolClient, studentId: string) {
  const checkInId = `${studentId}-baseline`;
  await client.query(
    `INSERT INTO "CheckIn" ("id", "studentId", "semesterId", "kind", "periodKey", "submittedAt")
     SELECT $1, "id", "semesterId", 'ONBOARDING', 'ONBOARDING', $3
     FROM "StudentProfile" WHERE "id" = $2`,
    [checkInId, studentId, new Date(previousDate.getTime() - 86_400_000).toISOString()],
  );
  await client.query(
    `INSERT INTO "CheckInAnswer"
     ("id", "checkInId", "questionId", "selectedOptionId", "questionTextSnapshot",
      "optionLabelSnapshot", "directionValueSnapshot", "sortOrder",
      "domainSnapshot", "stableSnapshot", "questionSignatureSnapshot")
     SELECT $1 || '-' || question."id", $1, question."id", option."id", question."text",
       option."label", option."directionValue", question."sortOrder",
       question."domain", false, $2
     FROM "Question" question
     JOIN LATERAL (
       SELECT * FROM "QuestionOption" WHERE "questionId" = question."id"
       ORDER BY "sortOrder" LIMIT 1
     ) option ON true
     WHERE question."context" = 'ONBOARDING' AND question."active" = true`,
    [checkInId, signature],
  );
}

async function insertWeekly(
  client: PoolClient,
  studentId: string,
  date: Date,
  previous: boolean,
) {
  const checkInId = `${studentId}-${previous ? "previous" : "current"}`;
  await client.query(
    `INSERT INTO "CheckIn"
     ("id", "studentId", "semesterId", "kind", "periodKey", "submittedAt", "mentorConversationRequest")
     SELECT $1, "id", "semesterId", 'WEEKLY', $3, $4, $5::"MentorConversationRequest"
     FROM "StudentProfile" WHERE "id" = $2`,
    // Prisma DateTime columns use UTC wall time in TIMESTAMP WITHOUT TIME ZONE.
    // Explicit ISO strings prevent pg from serializing Windows local wall time.
    [checkInId, studentId, getLuxembourgPeriodKey(date), date.toISOString(), previous ? "NO" : "MAYBE"],
  );
  const improved = studentId === studentIds[0] ? !previous : previous;
  const answers = [
    { questionId: questionIds[0], label: improved ? "Once." : "Several times.", value: improved ? 1 : 3 },
    { questionId: questionIds[1], label: "I kept track of most things.", value: 1 },
    { questionId: questionIds[2], label: previous ? "After some time." : "I did not need help this week.", value: previous ? 1 : null },
  ];
  for (const [index, answer] of answers.entries()) {
    await client.query(
      `INSERT INTO "CheckInAnswer"
       ("id", "checkInId", "questionId", "selectedOptionId", "questionTextSnapshot",
        "optionLabelSnapshot", "directionValueSnapshot", "sortOrder",
        "domainSnapshot", "stableSnapshot", "questionSignatureSnapshot")
       SELECT $1, $2, "id", $3, "text", $4, $5, $6, "domain", true, $7
       FROM "Question" WHERE "id" = $8`,
      [`${checkInId}-${index}`, checkInId, `${answer.questionId}-option-${answer.value ?? "neutral"}`,
        answer.label, answer.value, index, signature, answer.questionId],
    );
  }
}

test.beforeEach(async () => {
  currentDate = new Date();
  previousDate = new Date(currentDate.getTime() - weekMilliseconds);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await cleanFixtures(client);
    for (const [index, studentId] of studentIds.entries()) {
      // Reuse the seeded password hash and active semester, never seeded student records.
      await client.query(
        `INSERT INTO "User" ("id", "email", "name", "role", "passwordHash", "updatedAt")
         SELECT $1, $2, $3, 'STUDENT', "passwordHash", now()
         FROM "User" WHERE "id" = 'user-student-001'`,
        [studentId, `${studentId}@example.test`, `Journey Student ${index + 1}`],
      );
      await client.query(
        `INSERT INTO "StudentProfile" ("id", "userId", "semesterId", "updatedAt")
         SELECT $1, $1, "semesterId", now() FROM "StudentProfile" WHERE "userId" = 'user-student-001'`,
        [studentId],
      );
    }
    const questions = [
      { id: questionIds[0], text: questionText, domain: "WORK_START" },
      { id: questionIds[1], text: "How well did you keep track of your tasks this week?", domain: "ORGANISATION" },
      { id: questionIds[2], text: "How quickly did you ask for help this week?", domain: "HELP_SEEKING" },
    ];
    for (const [index, question] of questions.entries()) {
      await client.query(
        `INSERT INTO "Question"
         ("id", "key", "text", "domain", "type", "context", "stable", "active", "sortOrder", "updatedAt")
         VALUES ($1, $2, $3, $4::"DevelopmentDomain", 'SINGLE_CHOICE', 'WEEKLY', true, false, 9000, now())`,
        [question.id, `PHASE04_E2E_JOURNEY_${index}`, question.text, question.domain],
      );
      for (const [sortOrder, [label, direction]] of [["Once.", 1], ["Several times.", 3]].entries()) {
        await client.query(
          `INSERT INTO "QuestionOption" ("id", "questionId", "label", "value", "directionValue", "sortOrder")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [`${question.id}-option-${direction}`, question.id, label, `option-${direction}`, direction, sortOrder],
        );
      }
    }
    for (const studentId of studentIds.slice(0, 2)) {
      await insertOnboarding(client, studentId);
      await insertWeekly(client, studentId, previousDate, true);
      await insertWeekly(client, studentId, currentDate, false);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

test.afterAll(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await cleanFixtures(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});

async function signIn(page: Page, email = `${studentIds[0]}@example.test`) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(email === "admin@example.test" ? /\/admin$/ : /\/student$/);
}

test("shows personal Journey reflections and immutable historical answers after an Admin edit", async ({ page, browser }, testInfo) => {
  await signIn(page);
  for (const name of ["Semester Journey", "What changed recently?", "Recent Check-ins", "Development areas"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("progressbar")).toHaveAccessibleName(/semester/i);
  const areas = page.getByRole("region", { name: "Development areas", exact: true });
  await expect(areas.getByText(improvingText, { exact: true })).toBeVisible();
  await expect(areas.getByText(/reported.*keeping track.*consistent/i)).toBeVisible();
  await expect(areas.getByText(notEnoughDataText, { exact: true })).toHaveCount(4);
  await expect(page.getByRole("region", { name: "What changed recently?", exact: true })
    .getByText(improvingText, { exact: true })).toBeVisible();
  await expect(page.getByText("Asking for help", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Your starting point", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("WORK_START");
  const desktopScreenshot = testInfo.outputPath("journey-desktop.png");
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  await testInfo.attach("Student Journey desktop", { path: desktopScreenshot, contentType: "image/png" });
  await page.getByText("Compare your last two Check-ins", { exact: true }).click();
  await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  await expect(page.getByText("Several times.", { exact: true })).toBeVisible();
  await expect(page.getByText("Once.", { exact: true })).toBeVisible();
  // A neutral answer remains in history, but is absent from directional comparison.
  await expect(page.getByText("I did not need help this week.", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "Open history", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/check-ins$/);
  await expect(page.getByText(questionText, { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Open reflection", exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/student/check-ins/${studentIds[0]}-current$`));
  await expect(page.getByRole("heading", { name: "Weekly Check-in", exact: true })).toBeVisible();
  await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  await expect(page.getByText("Once.", { exact: true })).toBeVisible();
  await expect(page.getByText("Getting started", { exact: true })).toBeVisible();
  await expect(page.getByText(/You said a mentor conversation might help/)).toBeVisible();
  const detailScreenshot = testInfo.outputPath("journey-detail.png");
  await page.screenshot({ path: detailScreenshot, fullPage: true });
  await testInfo.attach("Student historical reflection", { path: detailScreenshot, contentType: "image/png" });

  const adminContext = await browser.newContext();
  try {
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, "admin@example.test");
    await adminPage.goto(`/admin/questions/${questionIds[0]}/edit`);
    await adminPage.waitForLoadState("networkidle");
    await adminPage.getByLabel("Question text").fill(revisedQuestionText);
    await adminPage.getByLabel("Domain", { exact: true }).click();
    await adminPage.getByRole("option", { name: "Study confidence", exact: true }).click();
    await adminPage.getByLabel("Label", { exact: true }).first().fill("I chose a small first step.");
    await adminPage.getByRole("button", { name: "Save changes" }).click();
    await expect(adminPage).toHaveURL(/\/admin\/questions\?updated=true$/);
  } finally {
    await adminContext.close();
  }

  await page.reload();
  await expect(page.getByText(questionText, { exact: true })).toBeVisible();
  await expect(page.getByText("Once.", { exact: true })).toBeVisible();
  await expect(page.getByText("Getting started", { exact: true })).toBeVisible();
  await expect(page.getByText(revisedQuestionText, { exact: true })).toHaveCount(0);
  await expect(page.getByText("I chose a small first step.", { exact: true })).toHaveCount(0);
  await page.goto("/student");
  await expect(areas.getByText(improvingText, { exact: true })).toBeVisible();
});

test("does not reveal another student's reflection and protects unauthenticated details", async ({ page, browser }) => {
  await signIn(page);
  await page.goto(`/student/check-ins/${studentIds[1]}-current`);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByText(questionText, { exact: true })).toHaveCount(0);

  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto(`/student/check-ins/${studentIds[0]}-current`);
    await expect(otherPage).toHaveURL(/\/login$/);
    await signIn(otherPage, `${studentIds[1]}@example.test`);
    await expect(otherPage.getByRole("region", { name: "Development areas", exact: true })
      .getByText(moreDifficultText, { exact: true })).toBeVisible();
    await expect(otherPage.getByText(improvingText, { exact: true })).toHaveCount(0);
    await otherPage.goto(`/student/check-ins/${studentIds[0]}-current`);
    await expect(otherPage.getByRole("heading", { name: "404" })).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test("handles no onboarding, no weekly answers, and one weekly answer without inventing a trend", async ({ page }) => {
  const studentId = studentIds[2];
  await signIn(page, `${studentId}@example.test`);
  await expect(page.getByText("Complete onboarding before your first Check-in", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Begin onboarding", exact: true })).toBeVisible();

  const client = await pool.connect();
  try {
    await insertOnboarding(client, studentId);
    await page.reload();
    await expect(page.getByText("No weekly Check-ins yet", { exact: true })).toBeVisible();
    await expect(page.getByText(improvingText, { exact: true })).toHaveCount(0);
    await expect(page.getByText(moreDifficultText, { exact: true })).toHaveCount(0);
    await insertWeekly(client, studentId, currentDate, false);
  } finally {
    client.release();
  }
  await page.reload();
  await expect(page.getByText("Check-in completed this week", { exact: true })).toBeVisible();
  await expect(page.getByText(improvingText, { exact: true })).toHaveCount(0);
  await expect(page.getByText(moreDifficultText, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Development areas", exact: true })
    .getByText(notEnoughDataText, { exact: true })).toHaveCount(6);
});

test("keeps the mobile Journey readable and its primary action keyboard accessible", async ({ page }, testInfo) => {
  await signIn(page);
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/student");
    await expect(page.getByRole("heading", { name: "Semester Journey", exact: true })).toBeVisible();
    const primaryAction = page.locator("main a").first();
    await expect(primaryAction).toBeVisible();
    const bounds = await primaryAction.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.y + bounds!.height).toBeLessThan(844);
    const noHorizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(noHorizontalOverflow, `Dashboard overflows at ${width}px`).toBe(true);
    if (width === 375) {
      const mobileScreenshot = testInfo.outputPath("journey-mobile.png");
      await page.screenshot({ path: mobileScreenshot, fullPage: true });
      await testInfo.attach("Student Journey 375px mobile", { path: mobileScreenshot, contentType: "image/png" });
    }
  }
  // Follow the actual tab order from the browser chrome into the primary action.
  await page.goto("/student");
  const primaryAction = page.locator("main a").first();
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    if (await primaryAction.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(primaryAction).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/student\/check-ins(?:\/[^/]+)?$/);
});
