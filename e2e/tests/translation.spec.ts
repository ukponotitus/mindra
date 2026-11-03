import { expect, newPerson, signUp, test } from "./fixtures";

// Posts in other languages: the brand profile's "Posts are written in", the writing form's "Write posts in", a post
// translated into a new linked draft, and the Content Library's language label and filter. The stand-in writer marks
// each post with the language a real writer would have used ("[French] …"), since it can't write them.
const person = newPerson("translation");

const TALK = [
  "[00:00:01] Ada: Sunscreen matters every day, even indoors, because UV light passes through windows.",
  "[00:00:20] Ada: Use SPF 50 and apply two finger lengths for your face. Reapply every two hours outside.",
].join("\n");

test("write posts in French, translate one into Yoruba, and filter the library by language", async ({ page }) => {
  await signUp(page, person);
  const main = page.locator("main");

  // The brand's posts are written in French.
  await page.goto("/brand#voice");
  await main.getByLabel("Posts are written in").selectOption("fr");
  await main.getByRole("button", { name: "Save profile" }).click();
  await expect(main.getByText("Saved", { exact: true })).toBeVisible();

  // Posts from a pasted talk come in French by default.
  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Paste Transcript" }).click();
  await main.getByLabel("Project name").fill("Sunscreen every day");
  await main.locator("#transcript").fill(TALK);
  await main.getByRole("button", { name: "Start Processing" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  await main.getByRole("button", { name: "Write posts" }).first().click();
  await expect(main.getByLabel("Write posts in")).toHaveValue("fr");
  await main.getByRole("button", { name: /^Write \d+ posts?$/ }).click();
  const whatsapp = main.getByRole("article").filter({ hasText: "WhatsApp" }).first();
  await expect(whatsapp).toContainText("[French]", { timeout: 60_000 });
  await expect(whatsapp).toContainText("French");

  // Translated into Yoruba: a new draft, linked both ways.
  await whatsapp.getByRole("link", { name: /Edit/ }).click();
  await page.waitForURL(/\/library\/[0-9a-f-]{36}/);
  const translate = main.getByRole("region", { name: "Translate" });
  await translate.getByLabel("Language").selectOption("yo");
  await translate.getByRole("button", { name: "Translate" }).click();
  await expect(translate.getByRole("status")).toContainText("Translated into Yoruba.");
  await expect(translate).toContainText("Ask someone who speaks Yoruba to read it");
  await translate.getByRole("link", { name: "Open the Yoruba post" }).click();
  await expect(main.getByLabel("Post text")).toHaveValue(/^\[Yoruba\] \[French\]/);
  await expect(main.getByRole("region", { name: "Translate" }).getByRole("link", { name: "the French post" })).toBeVisible();

  // The library labels each post's language and filters by it.
  await page.goto("/library");
  await main.getByLabel("Language").selectOption("yo");
  await expect(main.getByRole("article")).toHaveCount(1);
  await expect(main.getByRole("article").first()).toContainText("Yoruba");
});
