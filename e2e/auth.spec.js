import { test, expect } from "@playwright/test";

// Each test logs in fresh so cookie state doesn't leak between tests.

test("rejects bad credentials and stays on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@kenyon.edu").fill("wrong@kenyon.edu");
  await page.getByPlaceholder("••••••••").fill("nope");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("admin login lands on the admin dashboard with stats", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@kenyon.edu").fill("admin@kenyon.edu");
  await page.getByPlaceholder("••••••••").fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/Admin Dashboard/i)).toBeVisible();
  await expect(page.getByText(/Approved tutors/i)).toBeVisible();
});

test("session persists across navigation", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@kenyon.edu").fill("alex.smith@kenyon.edu");
  await page.getByPlaceholder("••••••••").fill("student123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible();
  // Navigate to /tutors and confirm we are still authenticated (we see Find a Tutor heading, not the login page)
  await page.goto("/tutors");
  await expect(page.getByRole("heading", { name: /Find a Tutor/i })).toBeVisible();
});
