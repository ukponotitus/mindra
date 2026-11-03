import { expect, newPerson, signUp, test } from "./fixtures";

// On a phone: the tab bar along the bottom (Home, Create, Planner, Library, More), and Motion Studio's editor laid out
// for a thumb, its tools opening sheets over the lower part so the preview stays in sight.
const person = newPerson("phone");

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("the tab bar opens the main pages, what can be made, and the whole navigation", async ({ page }) => {
  await signUp(page, person);
  const tabs = page.getByRole("navigation", { name: "Quick navigation" });
  await tabs.getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/library/);
  await expect(tabs.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");

  await tabs.getByRole("button", { name: "Create" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /Photo post/ }).click();
  await expect(page).toHaveURL(/\/projects\/new\?type=photos/);
  await expect(page.getByRole("button", { name: "Photos", pressed: true })).toBeVisible();
  await expect(page.getByText("Choose photos from your gallery")).toBeVisible();

  // Chosen again while New Project is open: it switches.
  await tabs.getByRole("button", { name: "Create" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /Posts from a video/ }).click();
  await expect(page.getByRole("button", { name: "Video File", pressed: true })).toBeVisible();

  await tabs.getByRole("button", { name: "More" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});

test("Motion Studio's editor on a phone: tools open sheets, and adding a text opens it to edit", async ({ page }) => {
  await signUp(page, newPerson("phone-studio"));
  await page.goto("/studio");
  await page.getByRole("button", { name: /Create manually/ }).click();
  await page.getByLabel("Name").fill("Market day");
  await page.getByRole("button", { name: "Open the editor" }).click();
  await page.waitForURL(/\/studio\/[0-9a-f-]{36}/);

  // The editor has the screen: no tab bar, its own tools along the bottom.
  await expect(page.getByRole("navigation", { name: "Quick navigation" })).toHaveCount(0);
  const tools = page.getByRole("navigation", { name: "Editing tools" });
  await tools.getByRole("button", { name: "Text" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Add a title text" }).click();
  await expect(page.getByRole("dialog", { name: "Edit the text" })).toBeVisible();
  await expect(page.getByLabel("Words")).toHaveValue("Big news");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Export" }).click();
  const exporting = page.getByRole("dialog", { name: "Export" });
  await expect(exporting.getByRole("button", { name: "Make video" })).toBeDisabled();
  await expect(exporting.getByText("Add a photo or clip first.")).toBeVisible();
});

test("the Assistant page on a phone starts a new conversation and opens an earlier one", async ({ page }) => {
  await signUp(page, newPerson("phone-assistant"));
  await page.goto("/assistant");
  const chat = page.getByRole("region", { name: "Assistant" });
  await chat.getByLabel("Message the assistant").fill("What should I post this week?");
  await chat.getByLabel("Message the assistant").press("Enter");
  await expect(chat.getByText(/stand-in assistant/)).toBeVisible();

  await chat.getByRole("button", { name: "New conversation" }).click();
  await expect(chat.getByText(/stand-in assistant/)).toHaveCount(0);

  await chat.getByRole("button", { name: "Earlier conversations" }).click();
  await page.getByRole("menuitem", { name: /What should I post this week/ }).click();
  await expect(chat.getByText(/stand-in assistant/)).toBeVisible();
  await page.screenshot({ path: "../../assistant-phone.png" });
});
