---
name: project_ui_selectors
description: Selector facts for shadcn/ui components and key page landmarks in this app
metadata:
  type: project
---

## shadcn/ui component notes (base-nova style)

- `CardTitle` renders as a `<div data-slot="card-title">`, NOT a `<h3>` or any heading — do NOT use `getByRole('heading')` for card titles
- `Alert` renders as `<div role="alert" data-slot="alert">` — `getByRole('alert')` works correctly
- `AlertDescription` renders as a `<div data-slot="alert-description">`
- `Input` uses `React.forwardRef` with a native `<input>` (patched because base-nova's default breaks react-hook-form)

## Login page (`/login`) selectors

- Email input: `page.getByLabel('Email')` (label htmlFor="email", input id="email")
- Password input: `page.getByLabel('Password')` (label htmlFor="password", input id="password")
- Submit button: `page.getByRole('button', { name: 'Sign in' })` (also shows "Signing in…" while submitting)
- Client-side email error text: `"Invalid email address"` (Zod schema)
- Client-side password error text: `"Password is required"` (Zod schema)
- Server-side error: `page.getByRole('alert')` — Alert variant="destructive" wrapping AlertDescription

## HomePage (`/`) selectors

- Heading: `page.getByRole('heading', { name: 'Home' })` — actual `<h1>` element
- Server status text: `page.getByText('Server status:')` (partial match)

## UsersPage (`/users`) selectors

- Heading: `page.getByRole('heading', { name: 'Users' })` — actual `<h1>` element

## NavBar selectors

- Brand: `page.getByText('Helpdesk')` — a `<span>`
- Users link (admin only): `page.getByRole('link', { name: 'Users' })`
- User name: `page.getByText(session.user.name)` — a `<span>`
- Sign out button: `page.getByRole('button', { name: 'Sign out' })`

## NewUserModal selectors (`NewUserModal.tsx` + `NewUserForm.tsx`)

- Open with: `page.getByRole('button', { name: 'New User' })` on /users
- Modal heading: `page.getByRole('heading', { name: 'New User' })` — `<h2>` inside modal
- Close X button: `page.getByRole('button', { name: 'Close' })` (aria-label="Close")
- Overlay backdrop: `page.getByTestId('modal-overlay')`
- Name input: `page.getByLabel('Name')` (id="name")
- Email input: `page.getByLabel('Email')` (id="email", type="email")
- Password input: `page.getByLabel('Password')` (id="password", type="password", autoComplete="new-password")
- Submit button: `page.getByRole('button', { name: 'Create User' })` (shows "Creating…" while pending)
- Cancel button: `page.getByRole('button', { name: 'Cancel' })`
- Name validation error: `"Name must be at least 3 characters"`
- Email validation error: `"Invalid email address"`
- Password validation error: `"Password must be at least 8 characters"`
- Server/root error: `page.getByTestId('form-root-error')` — paragraph rendered when errors.root is set

## UsersTable selectors

- Table cells by value: `page.getByRole('cell', { name: value, exact: true })` — `<td>` elements have implicit role "cell"; use `exact: true` to prevent substring collisions
- Column headers: `page.getByRole('columnheader', { name: 'Name' })` etc. — `<th>` elements
- Edit button: `page.getByRole('button', { name: 'Edit {user.name}' })` — aria-label on pencil icon button
- Delete button: `page.getByRole('button', { name: 'Delete {user.name}' })` — aria-label on trash icon button; admin rows have NO delete button
- Columns: Name, Email, Role (badge), Joined

## EditUserModal selectors (`EditUserModal.tsx` + `EditUserForm.tsx`)

- Trigger: `page.getByRole('button', { name: 'Edit {user.name}' })` on UsersTable row
- Modal heading: `page.getByRole('heading', { name: 'Edit User' })` — `<h2>`
- Close X button: `page.getByRole('button', { name: 'Close' })` (aria-label="Close")
- Name input: `page.getByLabel('Name')` — htmlFor="edit-name", id="edit-name"
- Email input: `page.getByLabel('Email')` — htmlFor="edit-email", id="edit-email", type="email"
- Password input: `page.getByLabel('Password')` (partial match covers hint text) — id="edit-password", optional field
- Save button: `page.getByRole('button', { name: 'Save Changes' })` (shows "Saving…" while pending)
- Cancel button: `page.getByRole('button', { name: 'Cancel' })`
- Root server error: rendered as `<p class="text-xs text-destructive">` (no testid; assert with getByText or check errors.root)

## DeleteUserModal selectors (`DeleteUserModal.tsx`)

- Trigger: `page.getByRole('button', { name: 'Delete {user.name}' })` on UsersTable row
- Modal heading: `page.getByRole('heading', { name: 'Delete User' })` — `<h2>`
- Overlay: `page.getByTestId('delete-modal-overlay')`
- Close X button: `page.getByRole('button', { name: 'Close' })` (aria-label="Close")
- Body text: `page.getByText(user.name)` + `page.getByText('This action cannot be undone.')`
- Cancel button: `page.getByRole('button', { name: 'Cancel' })`
- Confirm delete button: `page.getByRole('button', { name: 'Delete' })` (shows "Deleting…" while pending)
- Error text: `<p class="text-xs text-destructive">` shown when mutation.isError

## type="email" bypass pattern

When a form input has `type="email"` and contains a non-email string, Chromium blocks native form submission with a browser tooltip. Use `submitFormBypassingBrowserValidation(page)` from `e2e/helpers/auth.ts` to dispatch a raw submit event so react-hook-form/Zod validation runs instead.

## base-ui Select (`client/src/components/ui/select.tsx`) — used by TicketsPage filters and TicketDetailsPanel

- `SelectTrigger` renders `role="combobox"`. `SelectContent`'s list renders `role="listbox"`, each `SelectItem` renders `role="option"`.
- The trigger has **no** `aria-label`/`aria-labelledby` linking it to the adjacent `<label className="field-label">` (no `htmlFor`/`id` pairing) — `getByLabel()` does not work. Its accessible name is just the current displayed value text, which changes as the user interacts, so `getByRole("combobox", { name: ... })` is unreliable for the *initial* state.
- **Fix**: add `data-testid` directly to `SelectTrigger` in the source component and select via `page.getByTestId(id).click()` then `page.getByRole("option", { name: ..., exact: true }).click()`. Only one popup is open at a time, so `getByRole("option", ...)` needs no extra scoping. Applied to `TicketDetailsPanel.tsx`: testids `assigned-to-select`, `status-select`, `category-select`.
- **Gotcha**: the trigger's `textContent` includes the chevron icon's fallback glyph appended after the value (observed as `"Unassigned▼"`). Assert with `toContainText(...)`, not `toHaveText(...)`, on the trigger element.

## TicketDetailPage (`/tickets/:id`) selectors

- Header status badge: wrapped in `<span data-testid="ticket-status-badge">` around `StatusBadge` in `TicketDetailPage.tsx` (added for e2e — `StatusBadge` is also reused inside `TicketsTable`, and the same status word appears a second time inside the Status select's trigger on this page, so bare text is ambiguous).
- Conversation message bubbles: `MessageBubble.tsx` has `data-testid="message-bubble"` on its root div (added for e2e) — use `.toHaveCount(n)` to verify a reply was/wasn't added, since "No replies yet." is unreachable for webhook-created fixtures (see [[project_ticket_fixtures]]).
- Reply textarea: `page.getByLabel("Reply")` (aria-label="Reply" on the `Textarea`). Submit button: `page.getByRole("button", { name: "Send Reply" })`.
- "Back to tickets" link: `page.getByRole("link", { name: /back to tickets/i })`.
- Card section titles ("Conversation", "Details", "AI Summary") are `CardTitle` `div`s, not headings — use `getByText`, matching the general CardTitle note above.
