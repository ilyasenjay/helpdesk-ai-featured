# Playwright E2E Writer — Memory Index

- [Auth system details](project_auth_system.md) — test users, routes, ProtectedRoute/AdminRoute behavior, Better Auth cookie scope
- [UI component selectors](project_ui_selectors.md) — shadcn CardTitle is a div (not heading), Alert has role="alert", how to reach key UI landmarks
- [E2E test infrastructure](project_e2e_infra.md) — global setup/teardown, test DB, how to run tests, known create-user.spec.ts bug
- [API-only endpoint testing](project_api_only_endpoints.md) — request-fixture pattern for webhooks/no-UI endpoints, Zod default error text, Mailgun signing key env gotcha
- [Ticket fixtures for e2e](project_ticket_fixtures.md) — no POST /api/tickets, create via webhook + search lookup, body/message duplication, aiSummary untestable via e2e
- [AI Polish button testing](project_ai_polish_feature.md) — real 503 ai_not_configured in test env (no ANTHROPIC_API_KEY), mock success via page.route
