# Repository Guidelines

## Project Structure & Module Organization

Teleport has two TypeScript services. `application/` is the Next.js 14 web app: routes live in `src/app/`, reusable UI in `src/components/`, client state and providers in `src/context/`, and API/tRPC code in `src/server/` and `src/trpc/`. Prisma data models are in `application/prisma/schema.prisma`; static assets are under `application/public/`.

`matchmaker/` is the Node.js worker that consumes booking events and assigns drivers. Its runtime entry point is `src/index.ts`; integrations for Kafka, Redis, Pusher, and environment validation are in `lib/`. Local Redis, PostgreSQL, Soketi, and Kafka dependencies are defined in the root `docker-compose.yml`.

## Build, Test, and Development Commands

Run commands from the relevant service directory.

- `docker compose up -d` starts local infrastructure.
- `pnpm install` installs a service's dependencies (both services use pnpm lockfiles).
- `pnpm dev` in `application/` runs the Next.js app in development mode.
- `pnpm build` in `application/` creates a production build; `pnpm start` serves it.
- `pnpm lint` in `application/` runs the Next.js ESLint checks.
- `pnpm dev` in `matchmaker/` runs the worker with file watching; `pnpm start` runs it once.
- `pnpm db:generate` regenerates Prisma Client; `pnpm db:migrate:dev` creates local migrations, while `pnpm db:migrate` deploys committed migrations.

## Coding Style & Naming Conventions

Use TypeScript throughout. Follow existing two-space indentation and let Prettier format code; `application/prettier.config.js` also orders Tailwind classes. Use PascalCase for React components (`AddressPicker.tsx`), camelCase for hooks and utilities (`useActiveLocation.ts`, `geoUtils.ts`), and route directories that match URL paths. Keep server-only code out of client components and validate external input with Zod schemas.

## Testing Guidelines

There is currently no automated test suite or coverage target. For changes, run the relevant lint/build command and manually exercise affected booking, driver, and real-time flows. When adding tests, place them beside the feature as `*.test.ts` or `*.test.tsx` and describe behavior rather than implementation.

## Commit & Pull Request Guidelines

Use concise, imperative commit subjects consistent with history, such as `Add matchmaking retry` or `Fix map picker defaults`. Keep commits focused. Pull requests should explain the user-visible or service-level change, note schema/environment changes, link the related issue when available, and include screenshots for UI updates. Call out required local services and verification steps.

## Security & Configuration

Never commit credentials or `.env` files. Configure database, Kafka, Redis, Pusher/Soketi, and map-provider values locally; use the environment validation modules before introducing new required settings.
