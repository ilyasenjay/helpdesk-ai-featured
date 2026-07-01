import { test, expect } from "@playwright/test";
import {
  loginAs,
  logout,
  expectLoginPage,
  expectHomePage,
  expectUsersPage,
  submitFormBypassingBrowserValidation,
  ADMIN,
  AGENT,
} from "./helpers/auth";

// ---------------------------------------------------------------------------
// Login — happy path
// ---------------------------------------------------------------------------
test.describe("Login — happy path", () => {
  test("admin can log in and is redirected to /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
    await expectHomePage(page);
  });

  test("agent can log in and is redirected to /", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(AGENT.email);
    await page.getByLabel("Password").fill(AGENT.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
    await expectHomePage(page);
  });

  test("NavBar shows admin name after login", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await expect(page.getByText(ADMIN.name)).toBeVisible();
  });

  test("NavBar shows agent name after login", async ({ page }) => {
    await loginAs(page, AGENT.email, AGENT.password);
    await expect(page.getByText(AGENT.name)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login — client-side validation errors (Zod, no network request needed)
// ---------------------------------------------------------------------------
test.describe("Login — client-side validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("submitting an empty form shows both field errors", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("invalid email format shows the email validation error", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("somepassword");
    // type="email" causes Chromium to block native form submission with a
    // browser tooltip. Bypass it so react-hook-form/Zod validation runs.
    await submitFormBypassingBrowserValidation(page);
    await expect(page.getByText("Invalid email address")).toBeVisible();
  });

  test("password filled but email empty shows the email validation error", async ({
    page,
  }) => {
    await page.getByLabel("Password").fill("somepassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(page.getByText("Password is required")).not.toBeVisible();
  });

  test("email filled but password empty shows the password validation error", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page.getByText("Invalid email address")).not.toBeVisible();
  });

  test("validation errors clear as the user corrects input", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Password is required")).toBeVisible();

    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("something");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Password is required")).not.toBeVisible();
    await expect(page.getByText("Invalid email address")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login — server-side error states
// ---------------------------------------------------------------------------
test.describe("Login — server-side errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("wrong password shows a destructive alert", async ({ page }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("WrongPassword999!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expectLoginPage(page);
  });

  test("non-existent email shows a destructive alert", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("SomePassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expectLoginPage(page);
  });

  test("submit button is disabled while the request is in flight", async ({
    page,
  }) => {
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill(ADMIN.password);

    await page.route("**/api/auth/sign-in/email", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });

    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(
      page.getByRole("button", { name: "Signing in…" })
    ).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------
test.describe("Session persistence", () => {
  test("after login, refreshing the page keeps the user logged in", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.reload();
    await expectHomePage(page);
    await expect(page.getByText(ADMIN.name)).toBeVisible();
  });

  test("unauthenticated user visiting / is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForURL("/login");
    await expectLoginPage(page);
  });

  test("unauthenticated user visiting /users is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForURL("/login");
    await expectLoginPage(page);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
test.describe("Logout", () => {
  test("clicking Sign out logs the user out and redirects to /login", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await logout(page);
    await expectLoginPage(page);
  });

  test("after logout, visiting / redirects to /login", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await logout(page);
    await page.goto("/");
    await page.waitForURL("/login");
    await expectLoginPage(page);
  });

  test("NavBar user name disappears after logout", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await expect(page.getByText(ADMIN.name)).toBeVisible();
    await logout(page);
    await expect(page.getByText(ADMIN.name)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Role-based access
// ---------------------------------------------------------------------------
test.describe("Role-based access", () => {
  test("admin can navigate to /users and sees the Users page", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");
    await expectUsersPage(page);
  });

  test("agent visiting /users is redirected to /", async ({ page }) => {
    await loginAs(page, AGENT.email, AGENT.password);
    await page.goto("/users");
    await page.waitForURL("/");
    await expectHomePage(page);
  });

  test("NavBar shows the Users link for admin", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("NavBar does not show the Users link for agent", async ({ page }) => {
    await loginAs(page, AGENT.email, AGENT.password);
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
  });

  test("admin can click the Users link in the NavBar to reach /users", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.getByRole("link", { name: "Users" }).click();
    await page.waitForURL("/users");
    await expectUsersPage(page);
  });
});

// ---------------------------------------------------------------------------
// Note: there is no "logged-in user visiting /login is redirected to /"
// test because Login.tsx does not check for an existing session — it renders
// the sign-in form regardless. If that redirect is added in the future,
// add a test here.
// ---------------------------------------------------------------------------
