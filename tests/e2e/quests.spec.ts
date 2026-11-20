import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const students = ["phase08-e2e-student-a", "phase08-e2e-student-b"];
const templateId = "phase08-e2e-template";
const studentUrl = `/mentor/students/${students[0]}`;
const formUrl = `${studentUrl}/quests/new`;
const privateNote = "PRIVATE-ONLY: preparation for a mentoring conversation.";
const internalNote = "INTERNAL-ONLY: follow up on the strategy next week.";
const agreement = "Start one assignment earlier this week.";
const experiment = "Begin the history assignment for 15 minutes on Tuesday before its Friday deadline.";
test.setTimeout(120_000);
test.describe.configure({ mode: "serial" });

async function cleanup() {
  await pool.query(`DELETE FROM "AuditEvent" WHERE "actorUserId" = ANY($1) OR "entityId" = $2 OR "entityId" IN (
    SELECT "id" FROM "QuestAssignment" WHERE "studentId" = ANY($1)
    UNION SELECT r."id" FROM "QuestReflection" r JOIN "QuestAssignment" q ON q."id" = r."questAssignmentId" WHERE q."studentId" = ANY($1)
    UNION SELECT "id" FROM "Observation" WHERE "studentId" = ANY($1))`, [students, templateId]);
  await pool.query('DELETE FROM "QuestReflection" WHERE "questAssignmentId" IN (SELECT "id" FROM "QuestAssignment" WHERE "studentId" = ANY($1))', [students]);
  await pool.query('DELETE FROM "QuestAssignment" WHERE "studentId" = ANY($1)', [students]);
  await pool.query('DELETE FROM "FollowUp" WHERE "studentId" = ANY($1)', [students]);
  await pool.query('DELETE FROM "MentoringConversationObservation" WHERE "studentId" = ANY($1)', [students]);
  await pool.query('DELETE FROM "SharedAgreement" WHERE "conversationId" IN (SELECT "id" FROM "MentoringConversation" WHERE "studentId" = ANY($1))', [students]);
  await pool.query('DELETE FROM "MentoringConversation" WHERE "studentId" = ANY($1)', [students]);
  await pool.query('DELETE FROM "Observation" WHERE "studentId" = ANY($1)', [students]);
  await pool.query('DELETE FROM "MentorAssignment" WHERE "studentId" = ANY($1)', [students]);
  await pool.query('DELETE FROM "User" WHERE "id" = ANY($1)', [students]);
  await pool.query('DELETE FROM "QuestTemplate" WHERE "id" = $1', [templateId]);
}

test.beforeEach(async () => {
  await cleanup();
  for (const [index, id] of students.entries()) {
    const mentorId = `mentor-profile-00${index + 1}`;
    await pool.query(`INSERT INTO "User" ("id", "email", "name", "role", "passwordHash", "updatedAt")
      SELECT $1, $2, 'Quest Student', 'STUDENT', "passwordHash", now() FROM "User" WHERE "id" = 'user-student-001'`, [id, `${id}@example.test`]);
    await pool.query(`INSERT INTO "StudentProfile" ("id", "userId", "semesterId", "updatedAt") SELECT $1, $1, "semesterId", now() FROM "StudentProfile" WHERE "userId" = 'user-student-001'`, [id]);
    await pool.query('INSERT INTO "MentorAssignment" ("id", "studentId", "mentorId") VALUES ($1, $2, $3)', [`${id}-assignment`, id, mentorId]);
    await pool.query(`INSERT INTO "MentoringConversation" ("id", "studentId", "mentorId", "semesterId", "submissionKey", "occurredAt", "topic", "privateNote", "updatedAt")
      SELECT $1, "id", $3, "semesterId", $1, now() - interval '1 hour', 'PRIVATE TOPIC: first steps', $4, now() FROM "StudentProfile" WHERE "id" = $2`, [`${id}-conversation`, id, mentorId, index === 0 ? privateNote : "Other Student private note"]);
    await pool.query('INSERT INTO "SharedAgreement" ("id", "conversationId", "text", "updatedAt") VALUES ($1, $2, $3, now())', [`${id}-agreement`, `${id}-conversation`, agreement]);
    await pool.query(`INSERT INTO "FollowUp" ("id", "studentId", "mentorId", "conversationId", "dueAt", "note", "updatedAt") VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, now())`, [`${id}-followup`, id, mentorId, `${id}-conversation`, index === 0 ? internalNote : "Other Student internal reminder"]);
  }
  await pool.query(`INSERT INTO "QuestTemplate" ("id", "key", "title", "description", "domain", "defaultDurationDays", "reflectionPrompt", "updatedAt")
    VALUES ($1, 'PHASE08_E2E_EARLY_START', 'E2E Early Start', 'Begin one assignment at least three days before its deadline and work on it for at least 15 minutes.', 'WORK_START', 7, 'What did you notice?', now())`, [templateId]);
  await pool.query(`INSERT INTO "Observation" ("id", "studentId", "semesterId", "domain", "type", "ruleKey", "episodeKey", "title", "summary", "firstDetectedAt", "lastDetectedAt", "updatedAt")
    SELECT $1, "id", "semesterId", 'WORK_START', 'REPEATED_DIFFICULTY', 'phase08-e2e', 'phase08-e2e', 'Private difficulty Observation', 'Retained Mentor evidence.', now(), now(), now() FROM "StudentProfile" WHERE "id" = $2`, [`${students[0]}-observation`, students[0]]);
  await pool.query('INSERT INTO "MentoringConversationObservation" ("conversationId", "observationId", "studentId") VALUES ($1, $2, $3)', [`${students[0]}-conversation`, `${students[0]}-observation`, students[0]]);
});
test.afterAll(async () => { await cleanup(); await pool.end(); });

async function signIn(page: Page, email = "mentor1@example.test", home = "mentor") {
  await page.goto("/login"); await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("MentoringDev!2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/${home}$`));
}
async function signOut(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).click(); await page.getByRole("menuitem", { name: "Sign out" }).click(); await expect(page).toHaveURL(/\/login$/);
}
async function fillTemplate(page: Page, title = "My early start") {
  await page.getByLabel("Starting point", { exact: true }).click(); await page.getByRole("option", { name: "E2E Early Start", exact: true }).click();
  await expect(page.getByLabel("Quest title", { exact: true })).toHaveValue("E2E Early Start");
  await page.getByLabel("Quest title", { exact: true }).fill(title); await page.getByLabel("Small behavioural experiment", { exact: true }).fill(experiment);
}
async function saveAssignment(page: Page) {
  await page.getByRole("button", { name: "Assign Quest", exact: true }).click(); await expect(page).toHaveURL(new RegExp(`${studentUrl}#quests$`));
}
async function assign(page: Page, title = "My early start") { await page.goto(formUrl); await fillTemplate(page, title); await saveAssignment(page); }
async function questId(title = "My early start") {
  return (await pool.query('SELECT "id" FROM "QuestAssignment" WHERE "studentId" = $1 AND "title" = $2', [students[0], title])).rows[0].id as string;
}

test("assigns a snapshot from a conversation, completes through reflection, and lets the Mentor review safely", async ({ page, browser }, testInfo) => {
  await signIn(page); await page.goto(studentUrl);
  await page.getByRole("region", { name: "Mentoring", exact: true }).getByRole("link", { name: "Assign Quest", exact: true }).click();
  await expect(page).toHaveURL(/\/quests\/new\?conversation=/);
  await expect(page.getByRole("button", { name: "Include agreement", exact: true })).toHaveAttribute("aria-pressed", "true");
  await fillTemplate(page); await saveAssignment(page);
  const quests = page.getByRole("region", { name: "Quests", exact: true });
  await expect(quests.getByRole("region", { name: "Active", exact: true })).toContainText(experiment);
  await expect(quests).toContainText(agreement);
  const id = await questId();
  const adminContext = await browser.newContext();
  try {
    const admin = await adminContext.newPage(); await signIn(admin, "admin@example.test", "admin");
    await admin.goto(`/admin/quest-templates/${templateId}/edit`);
    await admin.getByLabel("Title", { exact: true }).fill("Later template wording");
    await admin.getByLabel("Behavioural experiment", { exact: true }).fill("This different wording applies to future assignments only.");
    await admin.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(admin).toHaveURL(/\/admin\/quest-templates\?updated=true$/);
  } finally { await adminContext.close(); }
  await signOut(page); await signIn(page, `${students[0]}@example.test`, "student");
  await expect(page.getByRole("region", { name: "Active Quests", exact: true })).toContainText(experiment);
  const sectionOrder = await page.locator("main section[aria-labelledby]").evaluateAll((sections) => sections.map((section) => section.getAttribute("aria-labelledby")));
  expect(sectionOrder.indexOf("weekly-action-title")).toBeLessThan(sectionOrder.indexOf("active-quests-title"));
  expect(sectionOrder.indexOf("active-quests-title")).toBeLessThan(sectionOrder.indexOf("recent-changes-title"));
  for (const path of ["/student", "/student/quests", `/student/quests/${id}`]) {
    const response = await page.goto(path); const html = await response!.text();
    for (const forbidden of [privateNote, internalNote, "PRIVATE TOPIC", "Private difficulty Observation", '"privateNote"', "Later template wording"]) expect(html).not.toContain(forbidden);
    await expect(page.locator("main")).toContainText(experiment);
  }
  await expect(page.getByText(agreement, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Partly", exact: true }).click(); await page.getByRole("button", { name: "A little", exact: true }).click();
  const reflection = "Starting was easier once I chose just the first paragraph.";
  await page.getByLabel("What did you notice? (optional)", { exact: true }).fill(reflection);
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your reflection is saved", exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible(); await expect(page.getByText(reflection, { exact: true })).toBeVisible();
  await page.goto("/student/quests");
  await expect(page.getByRole("region", { name: "Completed", exact: true })).toContainText("My early start");
  await expect(page.getByText("First Quest reflection completed", { exact: true })).toBeVisible();
  await signOut(page); await signIn(page); await page.goto(studentUrl);
  const completed = quests.getByRole("region", { name: "Completed", exact: true });
  await expect(completed).toContainText("Partly"); await expect(completed).toContainText("A little"); await expect(completed).toContainText(reflection);
  expect((await pool.query('SELECT "status" FROM "Observation" WHERE "id" = $1', [`${students[0]}-observation`])).rows[0].status).toBe("OPEN");
  await completed.screenshot({ path: testInfo.outputPath("mentor-quest-review.png"), caret: "initial" });
});

test("limits active Quests to two and retains cancelled history while freeing capacity", async ({ page }) => {
  await signIn(page); await assign(page, "First experiment"); await assign(page, "Second experiment");
  await page.goto(formUrl); await expect(page.getByRole("alert").filter({ hasText: "two active Quests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign Quest", exact: true })).toHaveCount(0);
  await page.goto(studentUrl);
  const first = page.getByRole("region", { name: "Quests", exact: true }).locator('[data-slot="card"]').filter({ has: page.getByRole("heading", { name: "First experiment", exact: true }) });
  await first.getByRole("button", { name: "Cancel Quest", exact: true }).click();
  await expect(page.getByRole("region", { name: "Quests", exact: true }).getByRole("region", { name: "Cancelled", exact: true })).toContainText("First experiment");
  await assign(page, "Third experiment");
  expect((await pool.query('SELECT "status", count(*)::int AS count FROM "QuestAssignment" WHERE "studentId" = $1 GROUP BY "status" ORDER BY "status"', [students[0]])).rows).toEqual([{ status: "ACTIVE", count: 2 }, { status: "CANCELLED", count: 1 }]);
  const id = await questId("First experiment"); await signOut(page); await signIn(page, `${students[0]}@example.test`, "student");
  await page.goto(`/student/quests/${id}`); await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save reflection", exact: true })).toHaveCount(0);
  await page.goto("/student/quests"); await expect(page.getByRole("region", { name: "Cancelled", exact: true })).toContainText("First experiment");
});

test("denies direct access to unassigned Mentors, other Students, Admins and anonymous users", async ({ page, browser }) => {
  await signIn(page); await assign(page); const id = await questId();
  for (const [email, home] of [["mentor2@example.test", "mentor"], [`${students[1]}@example.test`, "student"], ["admin@example.test", "admin"], ["", "login"]]) {
    const context = await browser.newContext();
    try {
      const other = await context.newPage(); if (email) await signIn(other, email, home);
      if (home === "student") {
        await other.goto("/student/quests");
        for (const message of ["No active Quests right now.", "No completed Quests yet.", "No cancelled Quests yet."]) await expect(other.getByText(message, { exact: true })).toBeVisible();
      }
      for (const path of [studentUrl, formUrl, `/student/quests/${id}`]) {
        const response = await other.goto(path);
        if ((home === "mentor" && path.startsWith("/mentor")) || (home === "student" && path.startsWith("/student"))) await expect(other.getByRole("heading", { name: "404" })).toBeVisible();
        else await expect(other).toHaveURL(new RegExp(`/${home}$`));
        const html = await response!.text(); expect(html).not.toContain(experiment); expect(html).not.toContain(privateNote); expect(html).not.toContain(internalNote);
      }
    } finally { await context.close(); }
  }
});

test("rejects forged and revoked assignment forms and forged reflection submissions", async ({ page }) => {
  await signIn(page); await page.goto(formUrl); await fillTemplate(page);
  await page.locator('input[name="studentId"]').evaluate((element, value) => { (element as HTMLInputElement).value = value; }, students[1]);
  await page.getByRole("button", { name: "Assign Quest", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This Quest is no longer available to you.");
  await expect(page.getByLabel("Small behavioural experiment", { exact: true })).toHaveValue(experiment);
  await page.goto(formUrl); await fillTemplate(page);
  await page.locator('input[name="mentoringConversationId"]').evaluate((element, value) => { (element as HTMLInputElement).value = value; }, `${students[1]}-conversation`);
  await page.getByRole("button", { name: "Assign Quest", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  expect((await pool.query('SELECT count(*)::int AS count FROM "QuestAssignment" WHERE "studentId" = ANY($1)', [students])).rows[0].count).toBe(0);
  await assign(page); const id = await questId();
  await page.goto(formUrl); await fillTemplate(page, "Revoked experiment");
  await pool.query('UPDATE "MentorAssignment" SET "active" = false, "deactivatedAt" = now() WHERE "studentId" = $1', [students[0]]);
  await page.getByRole("button", { name: "Assign Quest", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This Quest is no longer available to you.");
  await page.reload(); await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await page.goto("/mentor");
  await signOut(page); await signIn(page, `${students[0]}@example.test`, "student");
  await page.goto(`/student/quests/${id}`);
  await page.getByRole("button", { name: "Partly", exact: true }).click(); await page.getByRole("button", { name: "Not sure", exact: true }).click();
  await page.locator('input[name="questId"]').evaluate((element) => { (element as HTMLInputElement).value = "forged-quest"; });
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("This Quest is no longer available to you.");
  expect((await pool.query('SELECT "status" FROM "QuestAssignment" WHERE "id" = $1', [id])).rows[0].status).toBe("ACTIVE");
});

test("supports a custom experiment and mobile keyboard reflection with No and Not sure", async ({ page }, testInfo) => {
  await signIn(page); await page.goto(formUrl);
  await page.getByLabel("Quest title", { exact: true }).fill("One small first step");
  await page.getByLabel("Small behavioural experiment", { exact: true }).fill("Choose one larger task and write down its smallest first step.");
  await saveAssignment(page); const id = await questId("One small first step");
  await signOut(page); await signIn(page, `${students[0]}@example.test`, "student");
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/student", "/student/quests", `/student/quests/${id}`]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} overflows at ${width}px`).toBe(true);
    }
    for (const label of ["Partly", "A little", "Save reflection"]) expect((await page.getByRole("button", { name: label, exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`quest-reflection-${width}.png`), fullPage: true, caret: "initial" });
  }
  await page.getByRole("button", { name: "Save reflection", exact: true }).click();
  await expect(page.locator("main").getByRole("alert").last()).toBeVisible();
  const no = page.locator('[aria-labelledby="quest-attempt-label"]').getByRole("button", { name: "No", exact: true }); await no.focus(); await no.press("Space");
  const unsure = page.getByRole("button", { name: "Not sure", exact: true }); await unsure.focus(); await unsure.press("Space");
  await expect(no).toHaveAttribute("aria-pressed", "true"); await expect(unsure).toHaveAttribute("aria-pressed", "true");
  const save = page.getByRole("button", { name: "Save reflection", exact: true }); await save.focus(); await save.press("Enter");
  await expect(page.getByRole("heading", { name: "Your reflection is saved", exact: true })).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/FAILED|MISSED|UNSUCCESSFUL/);
  expect((await pool.query('SELECT "attempted", "helpful", "reflectionText" FROM "QuestReflection" WHERE "questAssignmentId" = $1', [id])).rows).toEqual([{ attempted: "NO", helpful: "NOT_SURE", reflectionText: null }]);
});
