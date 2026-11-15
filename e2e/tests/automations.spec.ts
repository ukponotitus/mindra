import { expect, newPerson, signUp, test } from "./fixtures";
// The Automations redesign (11 November 2026): the template picker, the setup page that saves as it goes, the dashboard
// and the review queue, against the real API.
const person = newPerson("automations");
test.use({ viewport: { width: 1440, height: 900 } });
test("set up a kids cartoon automation from a template, and see it on the dashboard", async ({ page }) => {
  await signUp(page, person);
  await page.goto("/automations");
  await expect(page.getByRole("heading", { name: "Choose what Mindra should make" })).toBeVisible();
  await page.goto("/automations/new?template=kids");
  await expect(page.getByRole("radio", { name: /Kids cartoon/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/automations\/[0-9a-f-]{36}\/setup/);
  await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
  // Add a story idea and a character; both are saved to the API.
  await page.getByPlaceholder(/Add a story idea/).fill("Benny the bunny learns to share");
  await page.getByPlaceholder(/Add a story idea/).press("Enter");
  await expect(page.getByText("Benny the bunny learns to share")).toBeVisible();
  await page.getByRole("button", { name: "Add character" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Benny");
  await page.getByLabel("What they are").fill("Bunny");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Bunny · no voice yet")).toBeVisible();
  await page.getByRole("radio", { name: /Approve the final video only/ }).click();
  await expect(page.getByRole("radio", { name: /Approve the final video only/ })).toBeChecked();
  // It saves by itself a moment later.
  await expect(page.getByText("Saved as you go")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bunny · no voice yet")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Approve the final video only/ })).toBeChecked();
  await page.goto("/automations");
  await expect(page.getByText("Kids cartoon", { exact: false }).first()).toBeVisible();
  await page.goto("/automations/approvals");
  await expect(page.getByText("Nothing to review")).toBeVisible();
});

test("start an automation from a YouTube channel's link", async ({ page }) => {
  const other = newPerson("automations-channel");
  await signUp(page, other);
  await page.goto("/automations/new");
  await expect(page.getByRole("heading", { name: "Start from a channel" })).toBeVisible();
  // A link that isn't a channel's is refused in words.
  await page.getByLabel("YouTube channel link").fill("https://example.com/somewhere");
  await page.getByRole("button", { name: "Read the channel" }).click();
  await expect(page.getByText("That isn't a YouTube channel's link.", { exact: false })).toBeVisible();
  // The stand-in YouTube's channel: what was found, and what will be set up (the stand-in writer suggests nothing,
  // so the length, shape and schedule come from the channel alone, and the page says so).
  await page.getByLabel("YouTube channel link").fill("https://www.youtube.com/@historytold");
  await page.getByRole("button", { name: "Read the channel" }).click();
  await expect(page.getByRole("heading", { name: /What Mindra found on\s+History Told/ })).toBeVisible();
  await expect(page.getByText("Its newest 12")).toBeVisible();
  await expect(page.getByText("6:10")).toBeVisible();
  await expect(page.getByText("A history story, part 12")).toBeVisible();
  await expect(page.getByText("AI writing isn't switched on", { exact: false })).toBeVisible();
  await expect(page.getByText("About 6 minutes, landscape (16:9)")).toBeVisible();
  await page.getByRole("button", { name: "Create the automation" }).click();
  await page.waitForURL(/\/automations\/[0-9a-f-]{36}\/setup/);
  await expect(page.getByRole("link", { name: "History Told" })).toHaveAttribute("href", "https://www.youtube.com/channel/UCstandin0000000000000001");
  await expect(page.getByLabel("Automation name")).toHaveValue("Like History Told");
  // Its days came from the channel: Mondays and Thursdays.
  await expect(page.getByRole("button", { name: "Mon", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Thu", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Wed", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.goto("/automations");
  await expect(page.getByText("Like History Told").first()).toBeVisible();
});
