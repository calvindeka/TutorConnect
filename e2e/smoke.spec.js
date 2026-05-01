import { test, expect } from "@playwright/test";

test("home page renders the marketing hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Find the right tutor.")).toBeVisible();
  await expect(page.getByText("Book in seconds.")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible();
});

test("backend health check responds with ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.timestamp).toBeDefined();
});

test("student can log in, see their dashboard, and log out", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@kenyon.edu").fill("alex.smith@kenyon.edu");
  await page.getByPlaceholder("••••••••").fill("student123");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible();
  await expect(page.getByText(/Upcoming sessions/i).first()).toBeVisible();

  // Open the user menu and click Sign out
  await page.locator("#tc-user-menu").click();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);
});
