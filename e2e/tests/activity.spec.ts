import { expect, newPerson, signUp, test } from "./fixtures";

// The Activity log: what Mindra and the team did. Write posts, schedule one and mark it posted, then find both in the
// log, filter it by kind, and see the period's counts.
const person = newPerson("activity");

/** Tomorrow as YYYY-MM-DD in Lagos time, the time zone the tests' browser uses. */
function tomorrow() {
  const day = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
}

const TALK = [
  "[00:00:01] Ada: Sunscreen matters every day, even indoors, because UV light passes through windows.",
  "[00:00:20] Ada: Use SPF 50 and apply two finger lengths for your face. Reapply every two hours outside.",
  "[00:00:40] Ada: Our new SPF 50 is light, leaves no white cast and costs 8,500 naira.",
].join("\n");

test("scheduling a post and marking it posted show in the Activity log", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // Nothing yet.
  await page.goto("/activity");
  await expect(main.getByText("Nothing here yet")).toBeVisible();

  // Posts from pasted words; one scheduled, then marked as posted.
  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Paste Transcript" }).click();
  await main.getByLabel("Project name").fill("Sunscreen every day");
  await main.locator("#transcript").fill(TALK);
  await main.getByRole("button", { name: "Start Processing" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  await main.getByRole("button", { name: "Write posts" }).first().click();
  await main.getByRole("button", { name: /^Write \d+ posts?$/ }).click();
  const posts = main.getByRole("article");
  await expect(posts.first()).toBeVisible({ timeout: 60_000 });
  const whatsapp = posts.filter({ hasText: "WhatsApp" }).first();
  await whatsapp.getByRole("button", { name: /Schedule/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Tomorrow 9:00/ }).click();
  await dialog.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.goto(`/planner?view=agenda&date=${tomorrow()}`);
  await main.getByRole("link", { name: /WhatsApp/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Mark as posted/ }).click();
  await expect(page.getByText(/Marked as posted/).first()).toBeVisible();

  // The log, from the sidebar: both, newest first, with the post's first line and a link to it.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Activity log" }).click();
  await expect(page).toHaveURL(/\/activity$/);
  const events = main.getByRole("listitem");
  await expect(events.filter({ hasText: "You marked this WhatsApp post as posted" })).toHaveCount(1);
  await expect(events.filter({ hasText: /You scheduled this WhatsApp post for/ })).toHaveCount(1);
  await expect(events.first()).toContainText("marked this WhatsApp post as posted");
  await expect(events.first().getByRole("link", { name: "View post" })).toHaveAttribute("href", /\/library\/[0-9a-f-]{36}/);

  // The counts: one posted by the team.
  await expect(main.getByText("Posted by your team").locator("..")).toContainText("1");

  // Only planning: the scheduling, not the posting.
  await main.getByLabel("Activity", { exact: true }).selectOption("planning");
  await expect(page).toHaveURL(/type=planning/);
  await expect(events.filter({ hasText: /scheduled this WhatsApp post/ })).toHaveCount(1);
  await expect(events.filter({ hasText: "marked this WhatsApp post as posted" })).toHaveCount(0);

  // Accounts: nothing yet.
  await main.getByLabel("Activity", { exact: true }).selectOption("accounts");
  await expect(main.getByText("Nothing matches these filters")).toBeVisible();
  await main.getByRole("button", { name: "Clear filters" }).click();
  await expect(events.filter({ hasText: "marked this WhatsApp post as posted" })).toHaveCount(1);
});
