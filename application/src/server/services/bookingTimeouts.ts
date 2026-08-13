import { PaymentStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { BOOKING_TIMEOUTS, getBookingDeadline } from "@/lib/bookingDeadlines";
import {
  applyBookingCommand,
  BookingStateConflictError,
  InvalidBookingTransitionError,
} from "@/server/services/bookingTransitions";

async function applyTimeout(bookingId: string) {
  try {
    await db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return;
      const policy = getBookingDeadline(booking);
      if (!policy || policy.deadlineAt.getTime() > Date.now()) return;
      if (policy.outcome === "ESCALATE") return;

      await applyBookingCommand(tx, {
        bookingId,
        commandId: `timeout:${policy.kind}:${policy.deadlineAt.toISOString()}`,
        command:
          policy.outcome === "FAIL" ? "PAYMENT_FAILED" : "NO_DRIVER_FOUND",
        actorId: booking.userId,
        reason:
          policy.outcome === "FAIL"
            ? "Payment window expired"
            : "Matching deadline expired",
        metadata: {
          deadlineAt: policy.deadlineAt.toISOString(),
          source: "booking-timeout-reconciler",
        },
      });
    });
  } catch (error) {
    if (
      error instanceof InvalidBookingTransitionError ||
      error instanceof BookingStateConflictError
    )
      return;
    throw error;
  }
}

export async function reconcileCustomerBookingTimeouts(userId: string) {
  const now = new Date();
  const unpaidCutoff = new Date(now.getTime() - BOOKING_TIMEOUTS.paymentMs);
  const matchingCutoff = new Date(now.getTime() - BOOKING_TIMEOUTS.matchingMs);
  const stale = await db.booking.findMany({
    where: {
      userId,
      OR: [
        {
          paymentStatus: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
              PaymentStatus.AUTHORIZED,
            ],
          },
          createdAt: { lte: unpaidCutoff },
        },
        {
          paymentStatus: PaymentStatus.PAID,
          dispatchStatus: "SEARCHING",
          stateChangedAt: { lte: matchingCutoff },
        },
      ],
    },
    select: { id: true },
    take: 50,
  });
  await Promise.all(stale.map(({ id }) => applyTimeout(id)));
}

export async function reconcileBookingTimeout(
  bookingId: string,
  userId: string,
) {
  const owned = await db.booking.count({ where: { id: bookingId, userId } });
  if (owned) await applyTimeout(bookingId);
}
