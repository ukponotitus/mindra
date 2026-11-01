import { expect, newPerson, signUp, test } from "./fixtures";

// Phase 2: the assistant beside every page. Asked from Home it answers (the stand-in here, without Claude); asked
// about a post it proposes new text as a card, and only Apply changes the post. The conversation is on its own page too.
const person = newPerson("assistant");

const TALK = [
  "[00:00:01] Ada: Sunscreen matters every day, even indoors, because UV light passes through windows.",
  "[00:00:20] Ada: Use SPF 50 and apply two finger lengths for your face.",
].join("\n");

test("ask the assistant from any page, and apply what it suggests for a post", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // From Home: the panel opens beside the page, with suggestions to start from and the month's allowance.
  await page.getByRole("button", { name: "Open the assistant" }).click();
  const panel = page.getByRole("complementary", { name: "Assistant" });
  await expect(panel.getByText("How can I help?")).toBeVisible();
  await expect(panel.getByText(/messages left this month/)).toBeVisible();
  await panel.getByRole("button", { name: "What should I post this week?" }).click();
  await expect(panel.getByText(/stand-in assistant/)).toBeVisible();

  // A post to ask about.
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
  await posts.first().getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/library\/[0-9a-f-]{36}/);
  const postText = main.locator("#post-text");
  const before = await postText.inputValue();

  // Asked about the post, it proposes; nothing changes until Apply.
  await expect(panel.getByText("Asking about: This post")).toBeVisible();
  await panel.getByLabel("Message the assistant").fill("Make this shorter");
  await panel.getByLabel("Message the assistant").press("Enter");
  await expect(panel.getByText("Shorter text")).toBeVisible();
  await expect(postText).toHaveValue(before);
  await panel.getByRole("button", { name: "Apply" }).click();
  await expect(panel.getByText("The post's text was changed.")).toBeVisible();
  await expect(postText).toHaveValue("A shorter version of this post, written by the stand-in assistant.");

  // The same conversation, on the assistant's own page.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Assistant", exact: true }).click();
  await expect(page).toHaveURL(/\/assistant/);
  const conversation = page.getByRole("region", { name: "Assistant" });
  await expect(conversation.getByText("What should I post this week?").first()).toBeVisible();
  await expect(conversation.getByText("The post's text was changed.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Conversations" }).getByRole("button", { name: /^What should I post this week/ })).toBeVisible();
});

// Asked for a content calendar, it proposes every post as one card; Apply saves it as a draft calendar to approve.
// The calendar's own form counts posts a day too.
const planner = newPerson("assistant-calendar");

test("plan a content calendar with the assistant, and count posts a day in the form", async ({ page }) => {
  await signUp(page, planner);
  const main = page.locator("main");

  await page.getByRole("button", { name: "Open the assistant" }).click();
  const panel = page.getByRole("complementary", { name: "Assistant" });
  await panel.getByLabel("Message the assistant").fill("I need a content calendar for this week");
  await panel.getByLabel("Message the assistant").press("Enter");
  await expect(panel.getByText("Three days on Instagram")).toBeVisible();
  const posts = panel.getByRole("region", { name: "Posts in this calendar" });
  await expect(posts.getByText("Why we started")).toBeVisible();
  await expect(posts.getByText("Call to action: Follow for more").first()).toBeVisible();
  await panel.getByRole("button", { name: "Apply" }).click();
  await expect(panel.getByText(/saved as a draft calendar with 3 posts/)).toBeVisible();
  await panel.getByRole("link", { name: "Open the calendar" }).click();
  await page.waitForURL(/\/content-calendar\/[0-9a-f-]{36}/);
  await expect(main.getByRole("tab", { name: /Version 1 · Draft/ })).toBeVisible();
  await expect(main.getByText("Why we started")).toBeVisible();

  // Two posts a day for a week, without working out posts a week.
  await page.goto("/content-calendar/new");
  await main.getByRole("button", { name: "A week", exact: true }).click();
  await main.getByText("Posts a day").click();
  await main.getByRole("button", { name: "More posts a day on Instagram" }).click();
  await expect(main.getByText("14 posts over 7 days, 2 a day.")).toBeVisible();
  await expect(main.getByLabel("Name")).toHaveValue(/ to /);
});
