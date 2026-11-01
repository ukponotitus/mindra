import path from "node:path";
import { expect, newPerson, signUp, test } from "./fixtures";

// A photo post with audio: the audio is uploaded as a recording and connected to the post (its captions use what's
// said), and the server makes a vertical video of the photos with the audio as its sound, with Motion Studio's own
// renderer. The transcription is the backend's stand-in.
const person = newPerson("photo-video");
const PUBLIC = path.join(__dirname, "..", "..", "public");

/** Five seconds of a soft tone, as a WAV file. */
function tone(seconds = 5, rate = 22050) {
  const samples = seconds * rate;
  const data = Buffer.alloc(44 + samples * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + samples * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1) data.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 3000), 44 + i * 2);
  return data;
}

test("a photo post with audio gets a video of its photos", async ({ page }) => {
  test.setTimeout(240_000);
  await signUp(page, person);
  const main = page.locator("main");

  await page.getByRole("link", { name: "New Project" }).click();
  await main.getByRole("button", { name: "Photos" }).click();
  await main.getByLabel("Project name").fill("Thanksgiving Sunday");
  await main.locator("#photo-files").setInputFiles([path.join(PUBLIC, "og-image.png"), path.join(PUBLIC, "icons", "app-icon-1024.png")]);
  await main.getByLabel("Add audio (optional)").setInputFiles({ name: "thanks.wav", mimeType: "audio/wav", buffer: tone() });
  // The audio is used instead of connecting an existing recording.
  await expect(main.getByLabel("Connect to a recording")).toBeHidden();
  await main.getByRole("button", { name: "Upload 2 photos" }).click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);

  // The post's page follows the video: put together once the audio is transcribed, then made.
  const video = main.getByRole("region", { name: "Video with your audio" });
  await expect(video).toBeVisible();
  await expect(video.getByText("Your video is ready.")).toBeVisible({ timeout: 180_000 });
  await video.getByRole("link", { name: "Open in Motion Studio" }).click();
  await page.waitForURL(/\/studio\/[0-9a-f-]{36}/);
});
