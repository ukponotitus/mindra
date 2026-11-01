import { expect, test as base, type Page } from "@playwright/test";

/** A new person for a test file: their sign-up details, unique to this run. */
export function newPerson(label: string) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { name: "Ada Okafor", email: `${label}-${stamp}@example.com`, password: "Mindra-journey-2026!" };
}

/** Every page: Google Fonts blocked (it can hold up loading for 20 seconds from some networks), and any error the page
 * throws fails the test. */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(page);
    expect(errors, "errors thrown on the page").toEqual([]);
  },
});

export { expect };

/** Sign up through the form, and land in the app. */
export async function signUp(page: Page, person: ReturnType<typeof newPerson>) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(person.name);
  await page.getByLabel("Email address").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("checkbox", { name: /I'm 18 or older/ }).check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL(/\/dashboard/);
}

/** Log in through the form, and land in the app. */
export async function logIn(page: Page, person: ReturnType<typeof newPerson>) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.waitForURL(/\/dashboard/);
}
