import { expect, logIn, newPerson, signUp, test } from "./fixtures";

// Phase 0: signing up, the grouped sidebar (as on Facebook's Creator dashboard), and the Calendar renamed the Planner.
const person = newPerson("navigation");

test.describe.configure({ mode: "serial" });

test("sign up, log out and log back in", async ({ page }) => {
  await signUp(page, person);
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  await page.getByRole("button", { name: /^Account:/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.waitForURL(/\/login/);

  await logIn(page, person);
});

test("the sidebar groups related pages, and each page opens", async ({ page }) => {
  await logIn(page, person);
  const nav = page.getByRole("navigation", { name: "Main" });
  const header = page.getByRole("banner");

  // Each group opens and closes; its pages open with their own title.
  const pages: [group: string, link: string, title: string][] = [
    ["Brand", "Brand profile", "Brand Profile"],
    ["Plan", "Campaigns", "Campaigns"],
    ["Plan", "Content Plans", "Content Plans"],
    ["Create", "Projects", "Projects"],
    ["Create", "AI Studio", "AI Studio"],
    ["Create", "Clips", "Clips"],
    ["Create", "Vertical Videos", "Vertical Videos"],
    ["Create", "Motion Studio", "Motion Studio"],
    ["Content", "Content Library", "Content Library"],
    ["Content", "Planner", "Planner"],
    ["Insights", "Overview", "Analytics"],
  ];
  for (const [group, link, title] of pages) {
    const trigger = nav.getByRole("button", { name: group, exact: true });
    if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
    await nav.getByRole("link", { name: link, exact: true }).click();
    await expect(header.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: link, exact: true })).toHaveAttribute("aria-current", "page");
  }

  // A closed group shows which one holds the open page.
  await nav.getByRole("button", { name: "Content", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Planner", exact: true })).toBeHidden();
  await nav.getByRole("button", { name: "Content", exact: true }).click();
  await expect(nav.getByRole("link", { name: "Planner", exact: true })).toBeVisible();

  // The Insights pages are the Analytics tabs.
  await nav.getByRole("link", { name: "Audience", exact: true }).click();
  await expect(page).toHaveURL(/\/analytics\?tab=audience/);
  await expect(nav.getByRole("link", { name: "Audience", exact: true })).toHaveAttribute("aria-current", "page");
});

test("the Calendar is now the Planner, and old links still work", async ({ page }) => {
  await logIn(page, person);
  await page.goto("/calendar?view=week&date=2026-11-02");
  await expect(page).toHaveURL(/\/planner\?view=week&date=2026-11-02/);
  await expect(page.getByRole("heading", { name: "Planner", level: 2 })).toBeVisible();
});

test("on a phone, the sidebar opens as a drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await logIn(page, person);
  await page.getByRole("button", { name: "Open navigation" }).click();
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("button", { name: "Content", exact: true }).click();
  await nav.getByRole("link", { name: "Planner", exact: true }).click();
  await expect(page).toHaveURL(/\/planner/);
  await expect(page.getByRole("heading", { name: "Planner", level: 2 })).toBeVisible();
});
