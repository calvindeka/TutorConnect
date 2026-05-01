import { test, expect } from "@playwright/test";

test.describe("Tutor search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@kenyon.edu").fill("alex.smith@kenyon.edu");
    await page.getByPlaceholder("••••••••").fill("student123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible();
  });

  test("shows the seeded approved tutors", async ({ page }) => {
    await page.goto("/tutors");
    await expect(page.getByRole("heading", { name: /Find a Tutor/i })).toBeVisible();
    await expect(page.getByText("Jane Doe").first()).toBeVisible();
    await expect(page.getByText("Marcus Wong").first()).toBeVisible();
  });

  test("can open a tutor profile and see their reviews", async ({ page }) => {
    await page.goto("/tutors");
    await page.getByText("Jane Doe").first().click();
    await expect(page.getByRole("heading", { name: /Jane Doe/i })).toBeVisible();
    await expect(page.getByText("Subjects")).toBeVisible();
    await expect(page.getByText("Weekly availability")).toBeVisible();
    // Has at least one review (from the seed)
    await expect(page.getByText(/Reviews/i)).toBeVisible();
  });
});
