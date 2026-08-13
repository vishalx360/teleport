# Delivery State Machine Technical Specification

## 1. Purpose

This specification defines how Teleport controls a delivery from payment through dispatch and fulfillment. It complements `PRODUCT_SPEC.md` and is authoritative for backend transition rules.

The design keeps PostgreSQL as the durable read model, uses Temporal for long-running orchestration, and uses Kafka only to distribute committed domain events. No API route, webhook, or worker may update delivery state without the transition boundary defined here.

## 2. State Ownership

A booking has three independent state axes:

| Axis        | States                                                                                             | Owner                                                         |
| ----------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Payment     | `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `REFUND_PENDING`, `REFUNDED`                            | Payment transition commands driven by signed provider events  |
| Dispatch    | `NOT_STARTED`, `SEARCHING`, `ASSIGNED`, `NO_DRIVER_FOUND`, `CANCELLED`                             | Delivery workflow and customer cancellation commands          |
| Fulfillment | `NOT_STARTED`, `DRIVER_ARRIVING`, `AT_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` | Delivery workflow commands authorized for the assigned driver |

`Booking.status` remains a temporary compatibility projection for existing clients. New business rules must use the three state axes. It can be removed after all clients migrate.

## 3. Commands and Guards

| Command              | Required current state                           | Result                                         |
| -------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `PAYMENT_PROCESSING` | Payment pending; dispatch not started            | Payment processing                             |
| `PAYMENT_SUCCEEDED`  | Payment pending/processing; dispatch not started | Payment paid; dispatch searching               |
| `PAYMENT_FAILED`     | Payment pending/processing                       | Payment failed                                 |
| `DRIVER_ASSIGNED`    | Paid and searching                               | Dispatch assigned; fulfillment driver arriving |
| `NO_DRIVER_FOUND`    | Paid and searching                               | Dispatch no driver found; payment remains paid |
| `RETRY_MATCHING`     | Paid and no driver found                         | Dispatch searching; increment matching attempt |
| `CUSTOMER_CANCELLED` | Searching and not picked up                      | Dispatch and fulfillment cancelled             |
| `DRIVER_ARRIVED`     | Assigned and driver arriving                     | Fulfillment at pickup                          |
| `PARCEL_PICKED_UP`   | Assigned and at pickup                           | Fulfillment picked up                          |
| `DELIVERY_STARTED`   | Assigned and picked up                           | Fulfillment in transit                         |
| `DELIVERY_COMPLETED` | Assigned and in transit                          | Fulfillment delivered                          |
| `REFUND_REQUESTED`   | Paid and not picked up                           | Payment refund pending                         |
| `REFUND_COMPLETED`   | Refund pending                                   | Payment refunded                               |

Authorization and evidence are additional guards. Customer commands require booking ownership. Driver commands require assignment to that driver. Pickup and delivery will later require PIN/proof and geofence checks before their commands are accepted.

## 4. Transaction Contract

Every accepted command runs in one PostgreSQL transaction:

1. Deduplicate the command or external event.
2. Read the current booking state and `stateVersion`.
3. Validate the transition with the shared pure state machine.
4. Conditionally update the booking using the previous version.
5. Increment `stateVersion` exactly once.
6. Append one `BookingStateEvent` per changed axis.
7. Append the legacy `BookingEvent` while compatibility status exists.
8. Write any integration event to the transactional outbox.

If the conditional update affects no row, the caller receives a conflict and refetches. Commands are idempotent by `commandId`; Stripe events are additionally deduplicated by provider event ID.

## 5. Temporal Contract

Temporal owns timers, retries, offer expiry, matching attempts, and eventually the complete delivery workflow. Workflow code contains no network or database calls; Activities perform I/O.

One matching execution uses `booking-match-{bookingId}-{attempt}`. The attempt number permits an explicitly requested rematch without colliding with a completed workflow. Driver replies are Signals because they are asynchronous. Lifecycle actions will move to validated Temporal Updates as the workflow expands beyond matching.

PostgreSQL remains the UI and operations query source. Temporal history is an orchestration record, not the customer-facing database.

## 6. Kafka and Real-Time Contract

The application publishes only committed facts through `OutboxEvent`. Matchmaker consumes `booking.matching_requested.v1`; replay is safe because workflow IDs and transition command IDs are deterministic.

Pusher/Soketi events never carry authority. They tell clients to refetch the booking. Missing or duplicate real-time messages therefore cannot corrupt state.

## 7. Failure Semantics

- Payment failure never appears as dispatch failure.
- `NO_DRIVER_FOUND` leaves payment `PAID` and offers retry, cancellation/refund, or support according to policy.
- A terminal booking never exposes cancellation.
- Duplicate commands return the already-applied result.
- Out-of-order commands are rejected without mutation.
- External calls are retried through Temporal or the outbox, not inside database transactions.

## 8. Testing Requirements

The pure state machine requires table-driven tests for every allowed and rejected transition. Integration tests must cover duplicate commands, concurrent transitions, outbox atomicity, Stripe webhook replay, matching retries, and authorization. Temporal workflow replay tests are required before changing deployed workflow code.

## 9. Migration Plan

1. Add and backfill decomposed states, versioning, attempts, transition events, and external-event deduplication.
2. Route all existing writers through the transition boundary.
3. Update UI reads and action visibility to use decomposed state.
4. Expand the Temporal workflow through final delivery.
5. Remove compatibility `Booking.status` and legacy events after old clients are retired.
