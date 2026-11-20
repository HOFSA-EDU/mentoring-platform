import "dotenv/config";

import { expect, test, type Locator, type Page } from "@playwright/test";
import { Pool } from "pg";

const developmentPassword = "MentoringDev!2026";
const studentEmail = "student8@example.test";
const studentUserId = "user-student-008";
const studentProfileId = "student-profile-008";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Check-in E2E cleanup.");
}

const pool = new Pool({ connectionString: databaseUrl });

test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

async function cleanStudentReflections() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `SELECT "id" FROM "CheckIn" WHERE "studentId" = $1`,
      [studentProfileId],
    );
    const checkInIds = result.rows.map((row) => row.id);

    await client.query(
      `DELETE FROM "AuditEvent"
       WHERE "actorUserId" = $1 OR "entityId" = ANY($2::text[])`,
      [studentUserId, checkInIds],
    );
    await client.query(`DELETE FROM "Observation" WHERE "studentId" = $1`, [studentProfileId]);
    await client.query(`DELETE FROM "CheckIn" WHERE "studentId" = $1`, [
      studentProfileId,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(studentEmail);
  await page.getByLabel("Password").fill(developmentPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student$/);
}

async function chooseFirstAnswer(group: Locator) {
  const choice = group.locator('[data-slot="toggle-group-item"]').first();
  const label = (await choice.textContent())?.trim();

  if (!label) {
    throw new Error("Expected every reflection option to have a visible label.");
  }

  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  return label;
}

test.beforeEach(cleanStudentReflections);

test.afterAll(async () => {
  await cleanStudentReflections();
  await pool.end();
});

for (const signal of ["Yes", "Maybe", "No"] as const) {
const signalLabel = signal === "Yes" ? "Conversation requested" : "Conversation might help";
test(`student completes onboarding and weekly Check-in with ${signal}`, async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByText("Complete onboarding before your first Check-in", {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByText("Begin onboarding", { exact: true }).click();
  await expect(page).toHaveURL(/\/student\/onboarding$/);
  await page.waitForLoadState("networkidle");

  const onboardingGroups = page.locator('[data-slot="toggle-group"]');
  await expect(onboardingGroups).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) {
    await chooseFirstAnswer(onboardingGroups.nth(index));
  }
  await expect(page.getByText("10 of 10 answered")).toBeVisible();

  await page.getByRole("button", { name: "Complete onboarding" }).click();
  await expect(page).toHaveURL(/\/student\/onboarding\/complete\?submission=/);
  await expect(page.getByText("Onboarding complete", { exact: true })).toBeVisible();
  await expect(page.getByText(/you reported/i).first()).toBeVisible();

  await page.getByText("Continue to your dashboard", { exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  await expect(
    page.getByText("Your weekly Check-in is ready", { exact: true }),
  ).toBeVisible();

  await page.getByText("Start Check-in", { exact: true }).click();
  await expect(page).toHaveURL(/\/student\/check-in$/);
  await page.waitForLoadState("networkidle");

  const weeklyGroups = page.locator('[data-slot="toggle-group"]');
  await expect(weeklyGroups).toHaveCount(6);
  const selectedWeeklyLabels: string[] = [];
  for (let index = 0; index < 5; index += 1) {
    selectedWeeklyLabels.push(await chooseFirstAnswer(weeklyGroups.nth(index)));
  }
  await expect(page.getByText("Would a short conversation with your mentor be helpful for something right now?", { exact: true })).toBeVisible();
  await expect(weeklyGroups.nth(5).getByRole("button")).toHaveCount(3);
  await weeklyGroups
    .nth(5)
    .getByRole("button", { name: signal, exact: true })
    .click();
  await expect(page.getByText("6 of 6 answered")).toBeVisible();

  await page.getByRole("button", { name: "Submit Check-in" }).click();
  await expect(page).toHaveURL(/\/student\/check-in\/complete\?submission=/);
  await expect(page.getByText("Check-in complete", { exact: true })).toBeVisible();
  if (signal !== "No") {
    await expect(page.getByText(signalLabel, { exact: true })).toBeVisible();
  } else {
    await expect(page.getByText("Conversation requested", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Conversation might help", { exact: true })).toHaveCount(0);
  }

  await page.getByText("Return to dashboard", { exact: true }).click();
  await expect(page).toHaveURL(/\/student$/);
  await expect(
    page.getByText("Check-in completed this week", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Start Check-in", { exact: true })).toHaveCount(0);

  await page.getByText("Open history", { exact: true }).click();
  await expect(page).toHaveURL(/\/student\/check-ins$/);
  if (signal !== "No") {
    await expect(page.getByText(signalLabel, { exact: true })).toBeVisible();
  } else {
    await expect(page.getByText("No conversation requested", { exact: true })).toBeVisible();
    await expect(page.getByText("Conversation requested", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Conversation might help", { exact: true })).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Open reflection", exact: true }).first().click();
  await expect(page).toHaveURL(/\/student\/check-ins\/[^/]+$/);
  await expect(page.getByText(signal === "No" ? "No conversation requested" : signalLabel, { exact: true })).toBeVisible();
  for (const label of selectedWeeklyLabels) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }

  await page.goto("/student/check-in");
  await expect(page).toHaveURL(/\/student\?checkIn=completed$/);
  await expect(
    page.getByText("Check-in completed this week", { exact: true }),
  ).toBeVisible();
});

}
