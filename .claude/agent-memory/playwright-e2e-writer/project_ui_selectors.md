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

- Table cells by value: `page.getByRole('cell', { name: value })` — td elements in table have implicit role "cell"
- Columns: Name, Email, Role (badge), Joined

## type="email" bypass pattern

When a form input has `type="email"` and contains a non-email string, Chromium blocks native form submission with a browser tooltip. Use `submitFormBypassingBrowserValidation(page)` from `e2e/helpers/auth.ts` to dispatch a raw submit event so react-hook-form/Zod validation runs instead.
