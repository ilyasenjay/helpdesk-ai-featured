import { expect, type Page } from "@playwright/test";

export const ADMIN = {
  email: "admin@e2etest.local",
  password: "AdminPass123!",
  name: "Test Admin",
};

export const AGENT = {
  email: "agent@e2etest.local",
  password: "AgentPass123!",
  name: "Test Agent",
};

/** Fill the login form and click Sign in, then wait until landed on /. */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/** Click Sign out in the NavBar and wait until landed on /login. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");
}

/**
 * Dispatch a raw submit event on the form, bypassing the browser's native
 * type="email" validation so react-hook-form/Zod validation runs instead.
 */
export async function submitFormBypassingBrowserValidation(
  page: Page
): Promise<void> {
  await page.evaluate(() =>
    (document.querySelector("form") as HTMLFormElement).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    )
  );
}

/** Assert the login page is showing (Sign in button visible, URL is /login). */
export async function expectLoginPage(page: Page): Promise<void> {
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
}

/** Assert the home page is showing. */
export async function expectHomePage(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}

/** Assert the users page is showing. */
export async function expectUsersPage(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}
