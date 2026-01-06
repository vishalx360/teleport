# Matchmaker Service

Temporal-based matchmaking service that orchestrates driver assignment for bookings.

## Architecture

This service uses Temporal.io for durable workflow orchestration:

- **Workflow**: `matchmakingWorkflow` - Orchestrates the process of finding and assigning a driver
- **Activities**: Handle I/O operations like Redis queries, database updates, and notifications

## Prerequisites

- Node.js 18+
- Temporal Server running (see docker-compose in root)
- Redis for geolocation and PubSub
- PostgreSQL with Prisma schema

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Generate Prisma client:
```bash
pnpm prisma generate
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Start the worker:
```bash
pnpm dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | - |
| `DATABASE_URL` | PostgreSQL connection URL | - |
| `TEMPORAL_ADDRESS` | Temporal server address | `localhost:7233` |
| `TEMPORAL_NAMESPACE` | Temporal namespace | `default` |
| `TEMPORAL_TASK_QUEUE` | Task queue name | `matchmaking-queue` |

## Workflow Flow

1. Receive booking data
2. Query Redis for nearby available drivers (GEORADIUS)
3. For each driver:
   - Check availability
   - Lock driver
   - Send booking request via Redis PubSub (SSE delivery)
   - Wait for response signal or timeout
4. On acceptance: Update booking status, notify user
5. On rejection/timeout: Try next driver
6. If no driver accepts: Mark booking as failed

## Signals

- `driverResponse` - Sent when a driver accepts or rejects a booking
  - Payload: `{ driverId: string, accepted: boolean }`
