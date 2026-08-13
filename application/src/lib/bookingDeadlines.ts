export const BOOKING_TIMEOUTS = {
  paymentMs: 30 * 60 * 1_000,
  matchingMs: 10 * 60 * 1_000,
  driverArrivalMs: 45 * 60 * 1_000,
  pickupWaitMs: 20 * 60 * 1_000,
  pickupHandoffMs: 10 * 60 * 1_000,
  minimumTransitMs: 60 * 60 * 1_000,
  transitBufferMs: 30 * 60 * 1_000,
} as const;

type DeadlineBooking = {
  paymentStatus: string;
  dispatchStatus: string;
  fulfillmentStatus: string;
  createdAt: Date | string;
  stateChangedAt: Date | string;
  durationSeconds: number;
};

export type BookingDeadline = {
  kind:
    | "PAYMENT"
    | "MATCHING"
    | "DRIVER_ARRIVAL"
    | "PICKUP_WAIT"
    | "PICKUP_HANDOFF"
    | "IN_TRANSIT";
  deadlineAt: Date;
  label: string;
  outcome: "FAIL" | "NO_DRIVER" | "ESCALATE";
};

export function getBookingDeadline(
  booking: DeadlineBooking,
): BookingDeadline | null {
  const createdAt = new Date(booking.createdAt).getTime();
  const stateChangedAt = new Date(booking.stateChangedAt).getTime();
  const deadline = (
    kind: BookingDeadline["kind"],
    anchor: number,
    duration: number,
    label: string,
    outcome: BookingDeadline["outcome"],
  ): BookingDeadline => ({
    kind,
    deadlineAt: new Date(anchor + duration),
    label,
    outcome,
  });

  if (["PENDING", "PROCESSING", "AUTHORIZED"].includes(booking.paymentStatus))
    return deadline(
      "PAYMENT",
      createdAt,
      BOOKING_TIMEOUTS.paymentMs,
      "Complete payment",
      "FAIL",
    );
  if (
    booking.paymentStatus === "PAID" &&
    booking.dispatchStatus === "SEARCHING"
  )
    return deadline(
      "MATCHING",
      stateChangedAt,
      BOOKING_TIMEOUTS.matchingMs,
      "Find a driver",
      "NO_DRIVER",
    );
  if (booking.fulfillmentStatus === "DRIVER_ARRIVING")
    return deadline(
      "DRIVER_ARRIVAL",
      stateChangedAt,
      BOOKING_TIMEOUTS.driverArrivalMs,
      "Driver arrival",
      "ESCALATE",
    );
  if (booking.fulfillmentStatus === "AT_PICKUP")
    return deadline(
      "PICKUP_WAIT",
      stateChangedAt,
      BOOKING_TIMEOUTS.pickupWaitMs,
      "Pickup handoff",
      "ESCALATE",
    );
  if (booking.fulfillmentStatus === "PICKED_UP")
    return deadline(
      "PICKUP_HANDOFF",
      stateChangedAt,
      BOOKING_TIMEOUTS.pickupHandoffMs,
      "Start delivery",
      "ESCALATE",
    );
  if (booking.fulfillmentStatus === "IN_TRANSIT") {
    const transitMs = Math.max(
      BOOKING_TIMEOUTS.minimumTransitMs,
      booking.durationSeconds * 2 * 1_000 + BOOKING_TIMEOUTS.transitBufferMs,
    );
    return deadline(
      "IN_TRANSIT",
      stateChangedAt,
      transitMs,
      "Expected delivery",
      "ESCALATE",
    );
  }
  return null;
}
