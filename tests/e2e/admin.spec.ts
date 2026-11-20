import "dotenv/config";

import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const developmentPassword = "MentoringDev!2026";
const studentEmail = "phase02-e2e-student@example.test";
const mentorEmail = "phase02-e2e-mentor@example.test";
const studentName = "Phase 02 Student";
const mentorName = "Phase 02 Mentor";
const questionKey = "PHASE02_E2E_WORK_START";
const templateKey = "PHASE02_E2E_SMALL_START";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Admin E2E cleanup.");
}

const pool = new Pool({ connectionString: databaseUrl });

test.setTimeout(120_000);

async function cleanAdminTestData() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM "AuditEvent"
       WHERE "entityId" IN (
         SELECT "id" FROM "User" WHERE "email" = ANY($1)
         UNION
         SELECT assignment."id"
         FROM "MentorAssignment" assignment
         LEFT JOIN "StudentProfile" student ON student."id" = assignment."studentId"
         LEFT JOIN "User" student_user ON student_user."id" = student."userId"
         LEFT JOIN "MentorProfile" mentor ON mentor."id" = assignment."mentorId"
         LEFT JOIN "User" mentor_user ON mentor_user."id" = mentor."userId"
         WHERE student_user."email" = ANY($1) OR mentor_user."email" = ANY($1)
         UNION
         SELECT "id" FROM "Question" WHERE "key" = $2
         UNION
         SELECT "id" FROM "QuestTemplate" WHERE "key" = $3
       )`,
      [[studentEmail, mentorEmail], questionKey, templateKey],
    );
    await client.query(
      `DELETE FROM "MentorAssignment"
       WHERE "studentId" IN (
         SELECT student."id"
         FROM "StudentProfile" student
         JOIN "User" account ON account."id" = student."userId"
         WHERE account."email" = ANY($1)
       ) OR "mentorId" IN (
         SELECT mentor."id"
         FROM "MentorProfile" mentor
         JOIN "User" account ON account."id" = mentor."userId"
         WHERE account."email" = ANY($1)
       )`,
      [[studentEmail, mentorEmail]],
    );
    await client.query(`DELETE FROM "Question" WHERE "key" = $1`, [questionKey]);
    await client.query(`DELETE FROM "QuestTemplate" WHERE "key" = $1`, [templateKey]);
    await client.query(`DELETE FROM "User" WHERE "email" = ANY($1)`, [
      [studentEmail, mentorEmail],
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.test");
  await page.getByLabel("Password").fill(developmentPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test.beforeAll(async () => {
  await cleanAdminTestData();
});

test.afterAll(async () => {
  await cleanAdminTestData();
  await pool.end();
});

test("admin creates structural records and assigns a mentor", async ({ page }) => {
  await signInAsAdmin(page);

  await page.getByRole("link", { name: "Students", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/students$/);
  await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
  await page.getByRole("button", { name: "New student" }).click();
  await expect(page).toHaveURL(/\/admin\/students\/new$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name").fill(studentName);
  await page.getByLabel("Email").fill(studentEmail);
  await page.getByLabel("Initial password").fill("Phase02Student!2026");
  await choose(page, "Semester", /Autumn 2026/);
  await page.getByRole("button", { name: "Create student" }).click();
  await expect(page).toHaveURL(/\/admin\/students\?created=true$/);
  await expect(page.getByRole("row").filter({ hasText: studentEmail })).toBeVisible();

  await page.getByRole("link", { name: "Mentors", exact: true }).click();
  await page.getByRole("button", { name: "New mentor" }).click();
  await expect(page).toHaveURL(/\/admin\/mentors\/new$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name").fill(mentorName);
  await page.getByLabel("Email").fill(mentorEmail);
  await page.getByLabel("Initial password").fill("Phase02Mentor!2026");
  await page.getByRole("button", { name: "Create mentor" }).click();
  await expect(page).toHaveURL(/\/admin\/mentors\?created=true$/);
  await expect(page.getByRole("row").filter({ hasText: mentorEmail })).toBeVisible();

  await page.getByRole("link", { name: "Assignments", exact: true }).click();
  await choose(page, "Student", studentName);
  await choose(page, "Mentor", mentorName);
  await page.getByRole("button", { name: "Assign mentor" }).click();
  const assignmentRow = page.getByRole("row").filter({ hasText: studentName });
  await expect(assignmentRow).toContainText(mentorName);
  await expect(assignmentRow).toContainText("Active");

  await page.getByRole("link", { name: "Questions", exact: true }).click();
  await page.getByRole("button", { name: "New question" }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/new$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Key").fill(questionKey);
  await page
    .getByLabel("Question text")
    .fill("How often did you begin a planned study task later than intended this week?");
  await choose(page, "Domain", "Work start");
  await choose(page, "Question type", "Single choice");
  await page.getByLabel("Label", { exact: true }).nth(0).fill("I started as planned");
  await page.getByLabel("Value", { exact: true }).nth(0).fill("as-planned");
  await page.getByLabel("Label", { exact: true }).nth(1).fill("I started later");
  await page.getByLabel("Value", { exact: true }).nth(1).fill("later");
  await page.getByRole("button", { name: "Create question" }).click();
  await expect(page).toHaveURL(/\/admin\/questions\?created=true$/);
  await expect(page.getByRole("row").filter({ hasText: questionKey })).toBeVisible();

  await page.getByRole("link", { name: "Quest Templates", exact: true }).click();
  await page.getByRole("button", { name: "New template" }).click();
  await expect(page).toHaveURL(/\/admin\/quest-templates\/new$/);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Key").fill(templateKey);
  await page.getByLabel("Title").fill("Small Start");
  await page
    .getByLabel("Behavioural experiment")
    .fill("Choose one study task and work on its smallest first step for ten minutes.");
  await choose(page, "Domain", "Work start");
  await page.getByLabel("Reflection prompt").fill("What helped you begin?");
  await page.getByRole("button", { name: "Create template" }).click();
  await expect(page).toHaveURL(/\/admin\/quest-templates\?created=true$/);
  await expect(page.getByRole("row").filter({ hasText: templateKey })).toBeVisible();
});
