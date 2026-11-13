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
