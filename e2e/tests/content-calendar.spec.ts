import { expect, newPerson, signUp, test } from "./fixtures";

// Phase 3: the content calendar. Drafted (by the stand-in here) from the dates, platforms and how often, changed,
// approved, and then planned in the Planner with no post written yet.
const person = newPerson("calendar");

test("draft a content calendar, change an item, approve it and see it planned", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  const nav = page.getByRole("navigation", { name: "Main" });
  const plan = nav.getByRole("button", { name: "Plan", exact: true });
  if ((await plan.getAttribute("aria-expanded")) !== "true") await plan.click();
  await nav.getByRole("link", { name: "Content calendar", exact: true }).click();
  await main.getByRole("link", { name: "Plan next month" }).click();
  await main.getByLabel("Name").fill("Launch weeks");
  await main.getByRole("button", { name: "More posts a week on TikTok" }).click();
  await main.getByLabel("What should it plan?").fill("Mostly tips");
  await main.getByRole("button", { name: "Draft the calendar" }).click();
  await page.waitForURL(/\/content-calendar\/[0-9a-f-]{36}/);

  // The draft, listed by day.
  await expect(main.getByRole("tab", { name: /Version 1 · Draft/ })).toBeVisible({ timeout: 30_000 });
  await expect(main.getByText("Asked for: “Mostly tips”")).toBeVisible();
  const items = main.getByRole("listitem").getByRole("button");
  await expect(items.first()).toBeVisible();

  // Change one item's topic.
  await items.first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Topic").fill("Why sunscreen every day");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(main.getByText("Why sunscreen every day")).toBeVisible();

  // Approve: it's planned in the Planner, with no post yet.
  await main.getByRole("button", { name: "Approve this calendar" }).click();
  await expect(main.getByRole("tab", { name: /Version 1 · Approved/ })).toBeVisible();
  await page.goto("/planner?view=agenda");
  await expect(main.getByRole("link", { name: /Why sunscreen every day/ }).first()).toBeVisible();

  // Phase 4: the plan. A strategy and a brief for each approved item, then approved.
  await page.goBack();
  await main.getByRole("link", { name: /The plan: briefs for/ }).click();
  await main.getByRole("button", { name: "Write the plan" }).click();
  await expect(main.getByRole("heading", { name: "The strategy" })).toBeVisible({ timeout: 30_000 });
  await expect(main.getByText("Why sunscreen every day").first()).toBeVisible();
  await main.getByRole("button", { name: "Approve the plan" }).click();
  await expect(main.getByText("Approved. The Content Studio makes each post from its brief.")).toBeVisible();

  // Phase 5: the Content Studio makes the post from its brief; a text-only format can be approved at once, and it's
  // planned at its time.
  await main.getByRole("link", { name: "Open the Content Studio" }).click();
  await expect(main.getByRole("heading", { name: /Ready to make/ })).toBeVisible();
  const card = main.getByRole("listitem").filter({ hasText: "Why sunscreen every day" });
  await card.getByRole("button", { name: "Make the post" }).click();
  await expect(main.getByRole("heading", { name: /Ready for review|In production/ }).first()).toBeVisible({ timeout: 30_000 });

  // Phase 7: Home says what waits, and plans next month from results.
  await page.goto("/dashboard");
  await expect(main.getByRole("heading", { name: "Waiting for you" })).toBeVisible();
  await expect(main.getByRole("link", { name: /ready for review|waiting for photos/ })).toBeVisible();
  await main.getByRole("link", { name: "Plan next month" }).click();
  await expect(main.getByRole("checkbox", { name: /Plan from what worked/ })).toBeChecked();
});
