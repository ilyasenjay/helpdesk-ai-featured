import { test, expect } from "@playwright/test";
import { loginAs, ADMIN, AGENT } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique email to avoid DB unique-constraint collisions. */
function uniqueEmail(): string {
  return `e2e-mgmt-${Date.now()}-${Math.floor(Math.random() * 9999)}@test.local`;
}

/** Generate a unique display name to avoid ambiguous selectors across parallel workers. */
function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

// ---------------------------------------------------------------------------
// 1. LIST
// ---------------------------------------------------------------------------
test.describe("User management — List", () => {
  test("admin navigates to /users and sees the users table with seeded users", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");

    // Page heading
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

    // Both seeded users appear as table rows
    await expect(
      page.getByRole("cell", { name: ADMIN.name, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: AGENT.name, exact: true })
    ).toBeVisible();

    // Table columns are present
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Joined" })
    ).toBeVisible();

    // "New User" button is present for admin
    await expect(
      page.getByRole("button", { name: "New User" })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. CREATE
// ---------------------------------------------------------------------------
test.describe("User management — Create", () => {
  test("admin opens the New User modal, submits valid data, and the new user appears in the table", async ({
    page,
  }) => {
    const name = uniqueName("Created User");
    const email = uniqueEmail();

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");

    // Open modal
    await page.getByRole("button", { name: "New User" }).click();
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).toBeVisible();

    // Fill form
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("SecurePass1!");

    // Submit
    await page.getByRole("button", { name: "Create User" }).click();

    // Modal closes on success
    await expect(
      page.getByRole("heading", { name: "New User" })
    ).not.toBeVisible();

    // New user row appears in the table
    await expect(
      page.getByRole("cell", { name, exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: email, exact: true })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. EDIT
// ---------------------------------------------------------------------------
test.describe("User management — Edit", () => {
  let testUserName: string;
  let testUserEmail: string;

  test.beforeEach(async ({ request }) => {
    // Authenticate as admin via the API so subsequent requests are authorised
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(signIn.ok()).toBeTruthy();

    // Create a fresh agent user to act as the edit target
    testUserName = uniqueName("Edit Target");
    testUserEmail = uniqueEmail();
    const create = await request.post("/api/users", {
      data: {
        name: testUserName,
        email: testUserEmail,
        password: "TestPass123!",
      },
    });
    expect(create.status()).toBe(201);
  });

  test("admin clicks the edit button, updates the user's name, and sees the new name in the table", async ({
    page,
  }) => {
    const updatedName = uniqueName("Renamed User");

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");

    // The test user row must be visible before editing
    await expect(
      page.getByRole("cell", { name: testUserName, exact: true })
    ).toBeVisible();

    // Click the edit (pencil) button for the test user
    await page.getByRole("button", { name: `Edit ${testUserName}` }).click();
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).toBeVisible();

    // Name input is pre-populated; clear it and enter the updated name
    await page.getByLabel("Name").fill(updatedName);

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Modal closes on success
    await expect(
      page.getByRole("heading", { name: "Edit User" })
    ).not.toBeVisible();

    // Updated name now appears in the table
    await expect(
      page.getByRole("cell", { name: updatedName, exact: true })
    ).toBeVisible();

    // Original name is no longer shown
    await expect(
      page.getByRole("cell", { name: testUserName, exact: true })
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. DELETE
// ---------------------------------------------------------------------------
test.describe("User management — Delete", () => {
  let testUserName: string;

  test.beforeEach(async ({ request }) => {
    // Authenticate as admin via the API
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(signIn.ok()).toBeTruthy();

    // Create a fresh agent user to act as the delete target
    testUserName = uniqueName("Delete Target");
    const create = await request.post("/api/users", {
      data: {
        name: testUserName,
        email: uniqueEmail(),
        password: "TestPass123!",
      },
    });
    expect(create.status()).toBe(201);
  });

  test("admin clicks the trash icon, confirms deletion, and the user disappears from the table", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");

    // Confirm the target user exists in the table before deleting
    await expect(
      page.getByRole("cell", { name: testUserName, exact: true })
    ).toBeVisible();

    // Click the delete (trash) button for the test user
    await page.getByRole("button", { name: `Delete ${testUserName}` }).click();

    // Confirmation modal appears
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).toBeVisible();
    // Modal body mentions the user's name (scoped to <p> to avoid matching the table cell)
    await expect(page.locator("p").filter({ hasText: testUserName })).toBeVisible();
    await expect(
      page.getByText("This action cannot be undone.")
    ).toBeVisible();

    // Confirm by clicking the destructive Delete button in the modal
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Modal closes after successful deletion
    await expect(
      page.getByRole("heading", { name: "Delete User" })
    ).not.toBeVisible();

    // Soft-deleted user no longer appears in the table (GET filters deletedAt: null)
    await expect(
      page.getByRole("cell", { name: testUserName, exact: true })
    ).not.toBeVisible();
  });

  test("admin users do not have a delete button in the table", async ({
    page,
  }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/users");

    // The admin's row has an edit button but no delete button
    await expect(
      page.getByRole("button", { name: `Edit ${ADMIN.name}` })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: `Delete ${ADMIN.name}` })
    ).not.toBeVisible();
  });
});
