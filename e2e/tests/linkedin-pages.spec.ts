import { expect, newPerson, signUp, test } from "./fixtures";

// LinkedIn through its second app (the Community Management API), against the stand-in LinkedIn (servers/linkedin.py):
// connecting the profile and the Page it administers, scheduling a post to the Page, posting it now, and its numbers.
const person = newPerson("linkedin");

const TALK = [
  "[00:00:01] Ada: Fresh bread takes time. We start the dough at four every morning so it's ready by seven.",
  "[00:00:20] Ada: This week we're hiring two bakers. Come by the shop or send us a message.",
].join("\n");

test("connect a LinkedIn profile and Page, schedule and post to the Page, and see its numbers", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // Connect: LinkedIn shares the profile and the Page; both are ticked.
  await page.goto("/settings#accounts");
  const card = main.getByRole("region", { name: "LinkedIn" });
  await expect(card.getByText("Your LinkedIn profile, and the LinkedIn Pages you administer.")).toBeVisible();
  await card.getByRole("button", { name: /^Connect/ }).click();
  await expect(main.getByRole("heading", { name: /Connect these to/ })).toBeVisible();
  await expect(main.getByRole("checkbox", { name: "Connect Ada Okafor (LinkedIn profile)" })).toBeChecked();
  const pageTick = main.getByRole("checkbox", { name: "Connect Grace Bakery (LinkedIn Page)" });
  await pageTick.uncheck();
  await expect(main.getByRole("button", { name: "Connect 1 of 2" })).toBeVisible();
  await pageTick.check();
  await main.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(main.getByText(/Connected\. Mindra can post to Ada Okafor \(LinkedIn profile\) and Grace Bakery \(LinkedIn Page\)/)).toBeVisible();

  // A LinkedIn post written from pasted words.
  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Paste Transcript" }).click();
  await main.getByLabel("Project name").fill("Fresh bread");
  await main.locator("#transcript").fill(TALK);
  await main.getByRole("button", { name: "Start Processing" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  await main.getByRole("button", { name: "Write posts" }).first().click();
  for (const platform of ["Instagram", "Facebook", "WhatsApp"]) await main.getByRole("checkbox", { name: platform, exact: true }).uncheck();
  await main.getByRole("checkbox", { name: "LinkedIn", exact: true }).check();
  await main.getByRole("button", { name: /^Write \d+ posts?$/ }).click();
  const post = main.getByRole("article").filter({ hasText: "LinkedIn" }).first();
  await expect(post).toBeVisible({ timeout: 60_000 });

  // Scheduled to post by itself on the Page: with a profile and a Page, Mindra asks which.
  await post.getByRole("button", { name: /Schedule/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Tomorrow 9:00/ }).click();
  await expect(dialog.getByText("Post it to one of your connected LinkedIn profiles and Pages at that time.")).toBeVisible();
  await dialog.getByRole("switch", { name: "Post automatically" }).click();
  await dialog.getByLabel("Account").selectOption({ label: "Grace Bakery" });
  await expect(dialog.getByText("Post it to Grace Bakery's LinkedIn Page at that time.")).toBeVisible();
  await dialog.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(dialog).toBeHidden();

  // Posted now instead, then its numbers from LinkedIn.
  await post.getByRole("button", { name: "Change schedule" }).click();
  await dialog.locator("label").filter({ hasText: "Post now" }).click();
  await dialog.getByRole("button", { name: /^Post to Grace Bakery now/ }).click();
  await expect(dialog.getByRole("link", { name: /LinkedIn/ }).first()).toBeVisible({ timeout: 60_000 });
  await page.keyboard.press("Escape");

  await page.goto("/library?tab=published");
  await main.getByRole("table").getByRole("link").first().click();
  await page.waitForURL(/\/library\/[0-9a-f-]{36}/);
  const analytics = main.getByRole("region", { name: "Analytics" });
  await analytics.getByRole("button", { name: "Update now" }).click();
  await expect(analytics.getByText("940")).toBeVisible();
  await expect(analytics.getByText("People reached")).toBeVisible();
  await expect(analytics.getByText("Clicks on LinkedIn")).toBeVisible();
  await expect(analytics.getByText(/On Grace Bakery\./)).toBeVisible();
});
