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
