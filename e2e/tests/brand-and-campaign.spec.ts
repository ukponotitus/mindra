import { expect, newPerson, signUp, test } from "./fixtures";

// Phase 1: a new account sets up its brand profile (partly filled in from its bio), then plans a campaign with
// targets, changes it and deletes it. Filling in uses Mindra's stand-in here, which picks out lines with prices.
const person = newPerson("brand");

test.describe.configure({ mode: "serial" });

test("set up the brand profile, partly filled in from a bio", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // Home asks for the profile first.
  await expect(main.getByRole("heading", { name: "Set up your brand profile" })).toBeVisible();
  await main.getByRole("link", { name: "Set it up" }).click();
  await page.waitForURL(/\/brand$/);
  await expect(main.getByRole("heading", { name: "Brand profile", level: 2 })).toBeVisible();

  // Fill it in for me: the suggestions go into the form, not straight into the profile.
  await main.getByLabel("Paste anything about your brand").fill("Glow by Ada makes skincare for the Lagos sun.\nSPF 50 sunscreen - ₦8,500\nFace wash: ₦4,000");
  await main.getByRole("button", { name: "Suggest" }).click();
  await expect(main.getByText("Suggestions: untick any you don't want")).toBeVisible();
  await main.getByRole("button", { name: "Use these" }).click();
  await expect(main.getByLabel("What you do")).toHaveValue("Glow by Ada makes skincare for the Lagos sun.");

  // The rest by hand, a tab at a time.
  await main.getByRole("button", { name: /^Small business/ }).click();
  await main.getByLabel("Name", { exact: true }).fill("Glow by Ada");
  await main.getByLabel("Who it's for").fill("Women aged 20 to 40 in Lagos");
  const tabs = main.getByRole("tablist", { name: "Brand profile" });
  await tabs.getByRole("tab", { name: /What you sell/ }).click();
  await expect(main.locator("input[value='SPF 50 sunscreen']")).toBeVisible();
  await expect(main.locator("input[value='₦8,500']")).toBeVisible();
  await main.getByRole("button", { name: "Next: Pillars" }).click();
  await main.getByRole("button", { name: "+ Education" }).click();
  await main.getByRole("button", { name: "+ Product" }).click();
  await tabs.getByRole("tab", { name: /Voice/ }).click();
  await main.getByLabel("Tone").selectOption("Warm");
  await tabs.getByRole("tab", { name: /Links/ }).click();
  await main.getByLabel("WhatsApp").fill("https://wa.me/2348000000000");
  await main.getByRole("button", { name: "Save profile" }).click();
  await expect(main.getByText("Saved", { exact: true })).toBeVisible();

  // Saved: still there after a reload (on the tab the address names), with every part filled in.
  await page.reload();
  await expect(main.getByLabel("WhatsApp")).toHaveValue("https://wa.me/2348000000000");
  await tabs.getByRole("tab", { name: /Who you are/ }).click();
  await expect(main.getByLabel("Name", { exact: true })).toHaveValue("Glow by Ada");
  await tabs.getByRole("tab", { name: /Pillars/ }).click();
  await expect(main.getByRole("list", { name: "Your pillars" })).toContainText("Education");
  for (const step of ["Who you are", "What you sell", "Pillars", "Links", "Voice"]) await expect(tabs.getByRole("tab", { name: new RegExp(`^${step}.*filled in`) })).toBeVisible();

  // Home stops asking.
  await page.getByRole("link", { name: "Home" }).click();
  await expect(main.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Set up your brand profile" })).toBeHidden();
});

test("plan a campaign with targets, change it and delete it", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL(/\/dashboard/);
  const main = page.locator("main");
  const nav = page.getByRole("navigation", { name: "Main" });

  await nav.getByRole("button", { name: "Plan", exact: true }).click();
  await nav.getByRole("link", { name: "Campaigns", exact: true }).click();
  await expect(main.getByRole("heading", { name: "No campaigns yet" })).toBeVisible();
  await main.getByRole("link", { name: "New campaign" }).first().click();

  // A small business sees selling first.
  await expect(main.getByRole("button", { name: /^Sell a product or service/ })).toBeVisible();
  await main.getByLabel("Name").fill("November Sunscreen Push");
  await main.getByRole("button", { name: /^Sell a product or service/ }).click();
  await main.getByLabel("What it promotes (optional)").selectOption({ label: "SPF 50 sunscreen (₦8,500)" });
  await main.getByLabel("The details posts must get right").fill("SPF 50 sunscreen, ₦8,500. 10% off in the first week. Order on WhatsApp.");
  await main.getByLabel("Where people should go (optional)").fill("https://wa.me/2348000000000");
  await main.getByLabel("Budget in naira (optional)").fill("50,000");
  await main.getByRole("button", { name: /TikTok/ }).click();
  await main.getByLabel("Target 1", { exact: true }).fill("300");
  await main.getByRole("button", { name: "Add a target" }).click();
  await main.getByLabel("Number to aim for, target 2").selectOption({ label: "Sales (reported by you)" });
  await main.getByLabel("Target 2", { exact: true }).fill("60");
  await main.getByRole("button", { name: "Create campaign" }).click();

  // Its page: the brief, and each target with where its number will come from.
  await page.waitForURL(/\/campaigns\/[0-9a-f-]{36}$/);
  await expect(main.getByRole("heading", { name: "November Sunscreen Push", level: 2 })).toBeVisible();
  await expect(main.getByText("SPF 50 sunscreen", { exact: true })).toBeVisible();
  await expect(main.getByText(/₦50,000, for reporting cost per result/)).toBeVisible();
  const targets = main.getByRole("region", { name: "Targets" });
  await expect(targets).toContainText("Link clicks");
  await expect(targets).toContainText("Counted by Mindra");
  await expect(targets).toContainText("Sales");
  await expect(targets).toContainText("Reported by you");

  // Phase 6: a result the owner records shows against its target.
  await targets.getByLabel("What").selectOption({ label: "Sales" });
  await targets.getByLabel("How many").fill("12");
  await targets.getByRole("button", { name: "Record" }).click();
  await expect(targets).toContainText("12 of 60");

  // Changed, then deleted.
  await main.getByRole("link", { name: "Change" }).click();
  await main.getByLabel("Name").fill("November Sunscreen Launch");
  await main.getByRole("button", { name: "Save changes" }).click();
  await expect(main.getByRole("heading", { name: "November Sunscreen Launch", level: 2 })).toBeVisible();
  await main.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete campaign" }).click();
  await page.waitForURL(/\/campaigns$/);
  await expect(main.getByRole("heading", { name: "No campaigns yet" })).toBeVisible();
});
