import path from "node:path";
import { expect, newPerson, signUp, test } from "./fixtures";

// Countdown posts from a flyer: the stand-in reading finds no date on it (it "reads" the name and note), so the
// person gives the event's date; days that have passed can't be chosen; the posts are written with the backend's
// stand-in writer and planned in the Planner.
const person = newPerson("countdown");
const PUBLIC = path.join(__dirname, "..", "..", "public");

function dayFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("a flyer's countdown posts are written and planned", async ({ page }) => {
  test.setTimeout(180_000);
  await signUp(page, person);
  const main = page.locator("main");

  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Flyer" }).click();
  await main.getByLabel("Project name").fill("Holy Ghost Night");
  await main.locator("#photo-files").setInputFiles(path.join(PUBLIC, "og-image.png"));
  await main.getByRole("button", { name: "Upload the flyer" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);

  const countdown = main.getByRole("region", { name: "Countdown posts" });
  await expect(countdown).toBeVisible({ timeout: 60_000 });
  await expect(countdown.getByText("Mindra didn't find the event's date on the flyer. When is it?")).toBeVisible();
  await expect(countdown.getByRole("button", { name: "Choose the event's date" })).toBeDisabled();

  // An event in two days: a week before and 3 days before have passed.
  await countdown.getByLabel("The event's date").fill(dayFromNow(2));
  await expect(countdown.getByRole("checkbox", { name: /A week before/ })).toBeDisabled();
  await expect(countdown.getByRole("checkbox", { name: /3 days before/ })).toBeDisabled();

  await countdown.getByLabel("The event's date").fill(dayFromNow(10));
  await countdown.getByLabel("Time of day").fill("09:00");
  const platforms = countdown.getByRole("group", { name: "Platforms" });
  for (const name of ["Instagram", "Facebook", "WhatsApp", "X", "LinkedIn", "TikTok"]) {
    const box = platforms.getByRole("checkbox", { name });
    if (["Facebook", "WhatsApp"].includes(name)) await box.check();
    else await box.uncheck();
  }
  await countdown.getByRole("button", { name: "Plan 8 countdown posts" }).click();

  await expect(countdown.getByText("Done. The countdown posts are in the Planner and on the Posts tab.")).toBeVisible({ timeout: 90_000 });
  await countdown.getByRole("link", { name: "See them in the Planner" }).click();
  await page.waitForURL(/\/planner\?date=/);
  await expect(main.getByText(/One week to go until Holy/).first()).toBeVisible();
});
