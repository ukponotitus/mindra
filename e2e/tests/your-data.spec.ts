import { expect, newPerson, signUp, test } from "./fixtures";

// The privacy promises: a copy of your data from Settings, and deleting your account with what's only yours.
const person = newPerson("your-data");

test("download your data, then delete your account", async ({ page }) => {
  await signUp(page, person);
  await page.goto("/settings");
  await expect(page.getByRole("tab", { name: "Account", exact: true })).toHaveAttribute("aria-selected", "true");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download your data" }).click();
  expect((await download).suggestedFilename()).toMatch(/^mindra-data-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByLabel("Your password").fill(person.password);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete everything" }).click();
  await expect(page).toHaveURL(/\/login\?account=deleted$/);
  await expect(page.getByText("Your account was deleted")).toBeVisible();

  // The account is gone: signing in again doesn't work.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByText(/isn't right|not right|Unable to log in|incorrect/i)).toBeVisible();
});
