# Tech Stack

## Frontend
- **React + TypeScript** — component-based UI for the dashboard and ticket views
- **Tailwind CSS** — utility-first styling
- **React Router** — client-side routing

## Backend
- **Node.js + Express + TypeScript** — REST API server
- **Database sessions** — for authentication

## Database
- **PostgreSQL** — relational data (tickets, users, categories); well-suited for filtering and sorting queries

## ORM
- **Prisma** — type-safe database access and migrations

## AI
- **Claude API (Anthropic)** — ticket classification, summaries, and suggested replies

## Email
- **SendGrid or Mailgun** — outbound replies; inbound handled via webhooks

## Deployment
- **Docker** + cloud provider (AWS, Railway, or Fly.io)
