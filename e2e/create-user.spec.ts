import { test, expect, type Page } from "@playwright/test";
import {
  loginAs,
  ADMIN,
  AGENT,
  submitFormBypassingBrowserValidation,
} from "./helpers/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique email for each test to avoid constraint violations. */
function uniqueEmail(): string {
  return `e2e-newuser-${Date.now()}-${Math.floor(Math.random() * 9999)}@test.local`;
}

/** Click "New User" and wait for the modal heading to appear. */
async function openNewUserModal(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New User" }).click();
  await expect(page.getByRole("heading", { name: "New User" })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
test.describe("Create user — happy path", () => {
  test("admin fills in valid fields and new user appears in the table", async ({
    page,
  }) => {
    const name = "Jane Smith";
    const email = uniqueEmail();

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");
    await openNewUserModal(page);

    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("SecurePass1!");
    await page.getByRole("button", { name: "Create User" }).click();

    // Modal should close on success
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();

    // New row should appear in the users table
    await expect(page.getByRole("cell", { name: email })).toBeVisible();
    await expect(page.getByRole("cell", { name: name, exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Client-side validation errors
// ---------------------------------------------------------------------------
test.describe("Create user — client-side validation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");
    await openNewUserModal(page);
  });

  test("name shorter than 3 chars shows validation error", async ({ page }) => {
    await page.getByLabel("Name").fill("ab");
    await page.getByLabel("Email").fill("valid@example.com");
    await page.getByLabel("Password").fill("validpass123");
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(
      page.getByText("Name must be at least 3 characters")
    ).toBeVisible();
    // Modal must stay open
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).toBeVisible();
  });

  test("invalid email format shows validation error", async ({ page }) => {
    await page.getByLabel("Name").fill("Valid Name");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("validpass123");
    // type="email" causes Chromium to block native submission — bypass it so
    // react-hook-form/Zod validation runs instead.
    await submitFormBypassingBrowserValidation(page);

    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).toBeVisible();
  });

  test("password shorter than 8 chars shows validation error", async ({
    page,
  }) => {
    await page.getByLabel("Name").fill("Valid Name");
    await page.getByLabel("Email").fill("valid@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).toBeVisible();
  });

  test("submitting an empty form shows all three field errors", async ({
    page,
  }) => {
    // Empty email on type="email" does NOT trigger browser validation, so no
    // bypass helper needed here.
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(
      page.getByText("Name must be at least 3 characters")
    ).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters")
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Server-side error — duplicate email
// ---------------------------------------------------------------------------
test.describe("Create user — server-side errors", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");
    await openNewUserModal(page);
  });

  test("duplicate email shows a server error inside the modal", async ({
    page,
  }) => {
    // ADMIN.email already exists in the seed — reusing it triggers the error
    await page.getByLabel("Name").fill("Duplicate User");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("ValidPass123!");
    await page.getByRole("button", { name: "Create User" }).click();

    await expect(page.getByTestId("form-root-error")).toBeVisible();
    // Modal must stay open after a server error
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Cancel / close — modal dismissal without creating a user
// ---------------------------------------------------------------------------
test.describe("Create user — cancel and close", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");
    await openNewUserModal(page);
  });

  test("clicking Cancel closes the modal", async ({ page }) => {
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();
  });

  test("clicking the X button closes the modal", async ({ page }) => {
    await page.getByRole("button", { name: "Close" }).click();
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();
  });

  test("clicking the overlay closes the modal", async ({ page }) => {
    // The overlay spans the full viewport; the modal is centered (~448 px wide).
    // Clicking at (10, 10) hits the overlay in the top-left corner, well outside
    // the modal content, so the modal div cannot intercept the pointer event.
    await page.getByTestId("modal-overlay").click({ position: { x: 10, y: 10 } });
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();
  });

  test("cancelling does not add a new row to the table", async ({ page }) => {
    const email = uniqueEmail();
    await page.getByLabel("Name").fill("Cancelled User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("ValidPass123!");
    await page.getByRole("button", { name: "Cancel" }).click();

    // The partially-filled email must not appear anywhere in the table
    await expect(page.getByText(email)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Route protection — UI and API
// ---------------------------------------------------------------------------
test.describe("Users page — route protection", () => {
  test("agent navigating to /users is redirected to /", async ({ page }) => {
    await loginAs(page, AGENT.email, AGENT.password);
    await page.goto("/users");
    await page.waitForURL("/");
    await expect(
      page.getByRole("heading", { name: "Users" })
    ).not.toBeVisible();
  });

  test("agent cannot POST to /api/users (403 Forbidden)", async ({
    request,
  }) => {
    // Establish an agent session through the auth endpoint — the request
    // fixture preserves cookies across calls within the same test.
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: { email: AGENT.email, password: AGENT.password },
    });
    expect(signIn.ok()).toBeTruthy();

    const create = await request.post("/api/users", {
      data: {
        name: "Unauthorized User",
        email: uniqueEmail(),
        password: "ValidPass123!",
      },
    });
    expect(create.status()).toBe(403);
  });

  test("unauthenticated POST to /api/users is rejected (401)", async ({
    request,
  }) => {
    const create = await request.post("/api/users", {
      data: {
        name: "No Auth User",
        email: uniqueEmail(),
        password: "ValidPass123!",
      },
    });
    expect(create.status()).toBe(401);
  });
});
