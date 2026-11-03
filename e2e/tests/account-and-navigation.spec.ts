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

  // Home asks how Mindra is working, and the feedback is sent to the team.
  const feedback = page.getByRole("region", { name: "How is Mindra working for you?" });
  await feedback.getByText("Well", { exact: true }).click();
  await feedback.getByLabel("Your feedback").fill("Writing posts was quick.");
  await feedback.getByRole("button", { name: "Send feedback" }).click();
  await expect(feedback.getByText("Thank you, it's sent.")).toBeVisible();
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
    ["Create", "Clips", "Clips"],
    ["Create", "Vertical Videos", "Vertical Videos"],
    ["Create", "Motion Studio", "Motion Studio"],
    ["Content", "Content Library", "Content Library"],
    ["Content", "Comments", "Comments"],
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

test("AI Studio's old links open the Content Library", async ({ page }) => {
  await logIn(page, person);
  await page.goto("/ai-studio");
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "AI Studio" })).toHaveCount(0);
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

test("a new account starts light on a device set to dark, until the person chooses", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await signUp(page, newPerson("theme"));
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

  await page.goto("/settings#appearance");
  await page.getByRole("radio", { name: /Device setting/ }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.getByRole("radio", { name: /Light/ }).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});

test("a page whose code can't load says so with Reload, not a blank screen", async ({ page }) => {
  await logIn(page, person);
  // As after a deploy: the page's code is gone. It reloads once by itself, then says so, with the navigation still there.
  await page.route("**/src/pages/ContentLibrary.tsx*", (route) => route.abort());
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Content", exact: true }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Content Library" }).click();
  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "Mindra was updated" })).toBeVisible();
  await expect(alert.getByRole("button", { name: "Reload" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  await page.unroute("**/src/pages/ContentLibrary.tsx*");
  await alert.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByRole("heading", { name: "Content Library", level: 2 })).toBeVisible();
});
