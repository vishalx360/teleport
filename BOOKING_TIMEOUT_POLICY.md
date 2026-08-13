# Booking Timeout Policy

Waiting states must have a deadline. Temporal owns durable matching timers;
Stripe and the application reconciler provide independent payment-expiry
signals. State transitions remain idempotent and audited in
`BookingStateEvent`.

| State                                 |                                                  Deadline | Outcome                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------ |
| Payment pending/processing            |                          30 minutes from booking creation | Mark payment and booking failed. A later verified Stripe success is handled as an exception, not silently ignored.             |
| Searching for driver                  |                                                10 minutes | Stop matching and show “No driver found”; customer may retry. Individual offers currently expire after 20 seconds in Temporal. |
| Driver arriving                       |                                                45 minutes | Flag as overdue for operations review. Do not silently reassign an accepted job.                                               |
| Driver at pickup                      |                                                20 minutes | Escalate for customer/driver support; cancellation and refund require an explicit decision.                                    |
| Parcel picked up but trip not started |                                                10 minutes | Escalate. Never auto-cancel after custody begins.                                                                              |
| In transit                            | Twice quoted duration plus 30 minutes, minimum 60 minutes | Mark operationally overdue and notify support; keep tracking until delivered or manually resolved.                             |

The singleton `bookingTimeoutMonitorWorkflow` applies automatic pre-custody
deadlines every minute, even when nobody has the page open. Stripe expiration
webhooks and the read-time reconciler are independent safety nets. Timeout
commands use deterministic IDs, making retries and racing signals safe.
