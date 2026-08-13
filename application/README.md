# Teleport Web Application

The Next.js application contains the customer and driver web experience, tRPC
API, NextAuth integration, and Prisma database access.

## Local development

1. Use the repository-pinned Node.js version with `nvm install && nvm use`.
2. From the repository root, run `pnpm setup:local`.
3. Run `pnpm dev` to start this app and Matchmaker together.
4. Open `http://localhost:3000/login` and use the seeded local accounts.

Prisma 7 generates its client into `src/generated/prisma/`. Run
`pnpm db:generate` after schema changes; use `pnpm db:migrate:dev` to create a
development migration.

## Event responsibility

This application does **not** connect to Kafka. When a customer creates a
booking, the API stores the booking, audit event, and `OutboxEvent` in one
PostgreSQL transaction. Matchmaker relays that outbox record to Kafka and
starts the Temporal workflow. This prevents request handlers from losing or
duplicating event publication.

The API publishes live browser updates through Soketi/Pusher and uses Redis for
driver availability and live location. Those are temporary operational states;
PostgreSQL remains the source of truth.

## Stripe local testing

Add Stripe test-mode values to `application/.env` (or `.env.local`):

```dotenv
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Forward Stripe test webhooks while the application is running:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`. A booking stays
`PENDING` until the signed `checkout.session.completed` webhook marks it paid
and creates its matchmaking outbox event.
