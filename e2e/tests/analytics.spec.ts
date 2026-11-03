import { expect, newPerson, signUp, test } from "./fixtures";

// Analytics laid out like Facebook's Creator dashboard: a post shared by hand and marked as posted counts as a post out,
// and every section without numbers yet says what will fill it (no account is connected here, so no platform's
// numbers or followers are read, and none are made up).
const person = newPerson("analytics");

/** Tomorrow as YYYY-MM-DD in Lagos time, the time zone the tests' browser uses. */
function tomorrow() {
  const day = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
}

const TALK = [
  "[00:00:01] Ada: Sunscreen matters every day, even indoors, because UV light passes through windows.",
  "[00:00:20] Ada: Use SPF 50 and apply two finger lengths for your face. Reapply every two hours outside.",
].join("\n");

test("a post out by hand, then each tab's sections and what fills them", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // A post written from pasted words, shared by hand and marked as posted.
  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Paste Transcript" }).click();
  await main.getByLabel("Project name").fill("Sunscreen every day");
  await main.locator("#transcript").fill(TALK);
  await main.getByRole("button", { name: "Start Processing" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  await main.getByRole("button", { name: "Write posts" }).first().click();
  await main.getByRole("button", { name: /^Write \d+ posts?$/ }).click();
  const whatsapp = main.getByRole("article").filter({ hasText: "WhatsApp" }).first();
  await expect(whatsapp).toBeVisible({ timeout: 60_000 });
  await whatsapp.getByRole("button", { name: /Schedule/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Tomorrow 9:00/ }).click();
  await dialog.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.goto(`/planner?view=agenda&date=${tomorrow()}`);
  await main.getByRole("link", { name: /WhatsApp/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Mark as posted/ }).click();
  await expect(page.getByText(/Marked as posted/).first()).toBeVisible();

  // Overview: one post out, and nothing earlier to compare it with.
  await page.goto("/analytics");
  const overview = page.getByRole("tab", { name: /Posts out/ });
  await expect(overview).toContainText("1");
  await expect(overview).toContainText("No earlier posts to compare");
  // YouTube's numbers have their own section, kept apart as YouTube's rules ask; without a channel it says how to add one.
  const youtube = page.getByRole("region", { name: "From YouTube" });
  await expect(youtube).toContainText("YouTube's rules keep its numbers apart");
  await expect(youtube.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings#accounts");

  // Content: top content and views by content type wait for views.
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await expect(page.getByRole("region", { name: "Top content" })).toContainText("No views in this period yet");
  await expect(page.getByRole("region", { name: "Views by content type" })).toContainText("once your posts on X have views");
  await expect(page.getByRole("region", { name: "From YouTube" })).toBeVisible();

  // Engagement: each section waits for likes, comments and shares.
  await page.getByRole("tab", { name: "Engagement", exact: true }).click();
  await expect(page).toHaveURL(/tab=engagement/);
  await expect(page.getByRole("region", { name: "By interaction type" })).toContainText("No likes, comments or shares in this period yet");
  await expect(page.getByRole("region", { name: "By content type" })).toContainText("No likes, comments or shares in this period yet");
  await expect(page.getByRole("region", { name: "Top content" })).toContainText("No likes, comments or shares in this period yet");

  // Audience: followers are counted once an account is connected.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Audience", exact: true }).click();
  const followers = page.getByRole("region", { name: "Followers" });
  await expect(followers).toContainText("Mindra counts their followers once a day");
  await expect(followers.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings#accounts");
});
