# Matchmaker

Matchmaker is the delivery orchestration service. Kafka is the **durable event
transport**; Temporal is the **only workflow engine**. Neither system performs
the other’s responsibility.

## Kafka boundary

Kafka has one application topic and one consumer group:

| Item  | Value                           | Owner                    | Purpose                                |
| ----- | ------------------------------- | ------------------------ | -------------------------------------- |
| Topic | `BOOKINGS`                      | Application outbox relay | Durable, replayable booking events     |
| Event | `booking.matching_requested.v1` | Application              | Starts one driver-matching attempt     |
| Key   | `bookingId`                     | Application              | Preserves per-booking ordering         |
| Group | `matchmaking-group`             | Matchmaker               | Starts the Temporal workflow           |

The payload is intentionally small:

```json
{ "bookingId": "...", "attempt": 1, "occurredAt": "2026-08-10T13:00:00.000Z" }
```

`eventId` and `eventType` are Kafka headers. Matchmaker only accepts
`booking.matching_requested.v1`. It starts `booking-match-<bookingId>-<attempt>`; Temporal’s stable
workflow ID makes Kafka’s at-least-once delivery safe.

During migration, the consumer also accepts retained `booking.created.v1`
events as attempt 1. New producers must only emit `booking.matching_requested.v1`.

Do not publish directly from request handlers. Create a PostgreSQL
`OutboxEvent` in the same transaction as the booking. The relay claims batches,
publishes to Kafka, and retries failed batches with backoff.

## Flow

```text
Next.js API → PostgreSQL Booking + OutboxEvent → Kafka BOOKINGS
  → Matchmaker consumer → Temporal booking-match workflow → Redis / Soketi
```

Temporal loads the authoritative booking from PostgreSQL. Kafka therefore
carries an integration event, not a duplicated booking record.

## Local development

From the repository root:

```bash
pnpm setup:local
```

Run the full local system from the repository root:

```bash
pnpm dev
```

Use plaintext local Kafka at `localhost:29092` with empty Kafka credentials.
For a managed Kafka cluster, set `KAFKA_URL`, `KAFKA_API_KEY`, and
`KAFKA_API_SECRET`; the client enables SASL/TLS only when both credentials are
present.

## Deployment guidance

Kafka is not required to run the web UI alone, but it is required for a real
booking to enter matching. Production should use a managed Kafka service or a
separately operated Kafka cluster—not the single-broker Docker setup. Monitor
consumer lag for `matchmaking-group`, failed/pending outbox rows, and the
Temporal worker’s health.
