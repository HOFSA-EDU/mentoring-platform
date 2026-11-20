import { expect, test, type Page } from "@playwright/test";

const developmentPassword = "MentoringDev!2026";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(developmentPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("protects every role route and reports invalid credentials generically", async ({
  page,
}) => {
  for (const path of [
    "/student",
    "/student/onboarding",
    "/student/check-in",
    "/student/check-ins",
    "/mentor",
    "/mentor/students",
    "/mentor/students/student-profile-001",
    "/mentor/students/student-profile-001/check-ins/missing",
    "/admin",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }

  await page.getByLabel("Email").fill("student1@example.test");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("student signs in, cannot enter another role, and signs out", async ({
  page,
}) => {
  await signIn(page, "student1@example.test");
  await expect(page).toHaveURL(/\/student$/);
  await expect(page.getByText("Alex Martin", { exact: true })).toBeVisible();

  const session = await page.request.get("/api/auth/session");
  const sessionBody = await session.json();
  expect(sessionBody.user).toMatchObject({
    email: "student1@example.test",
    role: "STUDENT",
  });
  expect(JSON.stringify(sessionBody)).not.toContain("passwordHash");

  await page.goto("/mentor");
  await expect(page).toHaveURL(/\/student$/);
  for (const path of ["/mentor/students", "/mentor/students/student-profile-001", "/mentor/students/student-profile-001/check-ins/missing"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/student$/);
  }

  await page.goto("/login");
  await expect(page).toHaveURL(/\/student$/);

  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("mentor signs in and cannot enter student or admin workspaces", async ({
  page,
}) => {
  await signIn(page, "mentor1@example.test");
  await expect(page).toHaveURL(/\/mentor$/);

  await page.goto("/student");
  await expect(page).toHaveURL(/\/mentor$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/mentor$/);
});

test("admin signs in but does not inherit student or mentor access", async ({
  page,
}) => {
  await signIn(page, "admin@example.test");
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/student");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/mentor");
  await expect(page).toHaveURL(/\/admin$/);
  for (const path of ["/mentor/students", "/mentor/students/student-profile-001", "/mentor/students/student-profile-001/check-ins/missing"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin$/);
  }
});
