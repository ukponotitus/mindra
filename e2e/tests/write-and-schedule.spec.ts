import { expect, newPerson, signUp, test } from "./fixtures";

// Phase 0: today's quickest way from words to a post going out. Paste a talk, write posts from it, schedule one, find it
// in the Planner and mark it as posted. The AI writer here is Mindra's stand-in, so the posts are sample drafts.
const person = newPerson("schedule");

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

test("write posts from a pasted talk, schedule one and mark it posted", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // A project from pasted words.
  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Paste Transcript" }).click();
  await main.getByLabel("Project name").fill("Sunscreen every day");
  await main.locator("#transcript").fill(TALK);
  await main.getByRole("button", { name: "Start Processing" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);

  // Posts for the platforms chosen (Instagram, Facebook and WhatsApp by default).
  await main.getByRole("button", { name: "Write posts" }).first().click();
  await main.getByRole("button", { name: /^Write \d+ posts?$/ }).click();
  const posts = main.getByRole("article");
  await expect(posts.first()).toBeVisible({ timeout: 60_000 });
  const whatsapp = posts.filter({ hasText: "WhatsApp" }).first();

  // Scheduled for tomorrow morning: it says it goes in the Planner.
  await whatsapp.getByRole("button", { name: /Schedule/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Tomorrow 9:00/ }).click();
  await expect(dialog.getByText(/This goes in the Planner for/)).toBeVisible();
  await dialog.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(dialog).toBeHidden();

  // In the Planner, as a list of tomorrow's month: the post is there, planned.
  await page.goto(`/planner?view=agenda&date=${tomorrow()}`);
  await expect(page.getByRole("heading", { name: "Planner", level: 2 })).toBeVisible();
  const planned = main.getByRole("link", { name: /WhatsApp/ }).first();
  await expect(planned).toBeVisible();

  // Shared by hand, then marked as posted.
  await planned.click();
  const postDialog = page.getByRole("dialog");
  await postDialog.getByRole("button", { name: /Mark as posted/ }).click();
  await expect(page.getByText(/Marked as posted/).first()).toBeVisible();
});
