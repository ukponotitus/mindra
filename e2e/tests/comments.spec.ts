import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, newPerson, signUp, test } from "./fixtures";

// The Comments page: a connected YouTube channel (seeded, with a Short Mindra follows) is read only once comments are
// turned on for it; then its comments and replies show newest first, with filters, "new since you last looked",
// Refresh and Reply on YouTube. The stand-in YouTube (servers/youtube.mjs) answers; nothing leaves the machine.
const person = newPerson("comments");

test("turn comments on, read them, filter them, see what's new, turn them off", async ({ page }) => {
  await signUp(page, person);
  execFileSync("bash", [path.join(__dirname, "../servers/seed.sh"), "youtube-post", person.email], { env: process.env });
  const main = page.locator("main");

  await page.goto("/comments");
  await expect(main.getByRole("heading", { name: "Read the comments on Ada's channel?" })).toBeVisible();
  await expect(main).toContainText("doesn't send them to the assistant or any AI");
  await main.getByRole("button", { name: "Turn on comments" }).click();

  // Read at once: newest first, the reply from the channel, the video's title, and a link to reply on YouTube.
  const chioma = main.getByRole("article", { name: "Comment by Chioma" });
  await expect(chioma).toContainText("Does this work for dark skin too?", { timeout: 30_000 });
  await expect(main.getByText("Reading comments on")).toBeVisible();
  await expect(chioma).toContainText("Sunscreen every day #shorts");
  await expect(chioma.getByRole("list", { name: "Replies" })).toContainText("Your channel");
  await expect(chioma.getByRole("link", { name: "Reply on YouTube" })).toHaveAttribute("href", /watch\?v=standin0001&lc=c1$/);
  const articles = main.getByRole("article");
  await expect(articles.first()).toContainText("Tunde");
  await expect(chioma.getByText("New", { exact: true }).first()).toBeVisible();

  // Filters: not replied to, and search.
  await main.getByRole("button", { name: "Not replied to" }).click();
  await expect(articles).toHaveCount(1);
  await expect(articles.first()).toContainText("Tunde");
  await main.getByRole("button", { name: "Not replied to" }).click();
  await main.getByLabel("Search comments").fill("skin type");
  await expect(articles).toHaveCount(1);
  await expect(articles.first()).toContainText("Chioma");
  await main.getByLabel("Search comments").fill("");
  await expect(articles).toHaveCount(2);

  // Looked at: nothing is new after a reload, until Refresh finds a new comment.
  await page.reload();
  await expect(articles).toHaveCount(2);
  await expect(articles.getByText("New", { exact: true })).toHaveCount(0);
  await main.getByRole("button", { name: "Refresh" }).click();
  const bola = main.getByRole("article", { name: "Comment by Bola" });
  await expect(bola).toContainText("Which SPF do you use?", { timeout: 30_000 });
  await expect(bola.getByText("New", { exact: true })).toBeVisible();
  await expect(main).toContainText("1 new since you last looked");
  await expect(main).toContainText("their comments show here once each platform approves Mindra");

  // Turning off deletes what was read.
  await main.getByRole("button", { name: "Turn off" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Turn off and delete" }).click();
  await expect(main.getByRole("heading", { name: "Read the comments on Ada's channel?" })).toBeVisible();
  await expect(articles).toHaveCount(0);
});
