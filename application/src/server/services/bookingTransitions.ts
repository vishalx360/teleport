import type { Prisma } from "@/generated/prisma/client";
import type { Booking } from "@/generated/prisma/client";
import type { BookingCommand } from "../../../../shared/bookingStateMachine";
import {
  InvalidBookingTransitionError,
  transitionBookingState,
} from "../../../../shared/bookingStateMachine";

export { InvalidBookingTransitionError };

export interface ApplyBookingCommandInput {
  bookingId: string;
  commandId: string;
  command: BookingCommand;
  actorId?: string;
  driverId?: string;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function applyBookingCommand(
  tx: Prisma.TransactionClient,
  input: ApplyBookingCommandInput,
): Promise<{ booking: Booking; applied: boolean }> {
  const duplicate = await tx.bookingStateEvent.findFirst({
    where: { bookingId: input.bookingId, commandId: input.commandId },
  });
  if (duplicate) {
    return {
      booking: await tx.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
      }),
      applied: false,
    };
  }

  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: input.bookingId },
  });
  const transition = transitionBookingState(
    {
      paymentStatus: booking.paymentStatus,
      dispatchStatus: booking.dispatchStatus,
      fulfillmentStatus: booking.fulfillmentStatus,
      legacyStatus: booking.status,
    },
    input.command,
  );
  const now = new Date();
  const nextVersion = booking.stateVersion + 1;
  const commandData: Prisma.BookingUncheckedUpdateManyInput = {};

  switch (input.command) {
    case "PAYMENT_FAILED":
      commandData.failureCode = "PAYMENT_TIMEOUT_OR_FAILURE";
      commandData.failedAt = now;
      break;
    case "PAYMENT_SUCCEEDED":
      commandData.matchingAttempt = { increment: 1 };
      commandData.temporalWorkflowId = `booking-match-${booking.id}-${booking.matchingAttempt + 1}`;
      commandData.failureCode = null;
      break;
    case "DRIVER_ASSIGNED":
      if (!input.driverId) throw new Error("DRIVER_ASSIGNED requires driverId");
      commandData.driverId = input.driverId;
      commandData.acceptedAt = now;
      commandData.failureCode = null;
      break;
    case "NO_DRIVER_FOUND":
      commandData.failureCode = "NO_DRIVER_AVAILABLE";
      commandData.failedAt = now;
      break;
    case "RETRY_MATCHING":
      commandData.matchingAttempt = { increment: 1 };
      commandData.temporalWorkflowId = `booking-match-${booking.id}-${booking.matchingAttempt + 1}`;
      commandData.failureCode = null;
      commandData.failedAt = null;
      break;
    case "CUSTOMER_CANCELLED":
      commandData.cancellationReason = input.reason;
      commandData.cancelledAt = now;
      break;
    case "DRIVER_ARRIVED":
      commandData.arrivedAt = now;
      break;
    case "PARCEL_PICKED_UP":
      commandData.pickedUpAt = now;
      break;
    case "DELIVERY_STARTED":
      commandData.inTransitAt = now;
      break;
    case "DELIVERY_COMPLETED":
      commandData.deliveredAt = now;
      break;
  }

  const result = await tx.booking.updateMany({
    where: { id: booking.id, stateVersion: booking.stateVersion },
    data: {
      ...commandData,
      paymentStatus: transition.state.paymentStatus,
      dispatchStatus: transition.state.dispatchStatus,
      fulfillmentStatus: transition.state.fulfillmentStatus,
      status: transition.state.legacyStatus,
      stateVersion: { increment: 1 },
      stateChangedAt: now,
    },
  });

  if (result.count !== 1) {
    const concurrentlyApplied = await tx.bookingStateEvent.findFirst({
      where: { bookingId: input.bookingId, commandId: input.commandId },
    });
    if (!concurrentlyApplied)
      throw new BookingStateConflictError(input.bookingId);
    return {
      booking: await tx.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
      }),
      applied: false,
    };
  }

  await tx.bookingStateEvent.createMany({
    data: transition.changes.map((change) => ({
      bookingId: booking.id,
      commandId: input.commandId,
      command: input.command,
      axis: change.axis,
      fromState: change.fromState,
      toState: change.toState,
      version: nextVersion,
      actorId: input.actorId,
      reason: input.reason,
      metadata: input.metadata,
    })),
  });

  if (transition.state.legacyStatus !== booking.status) {
    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: transition.state.legacyStatus,
        actorId: input.actorId,
        reason: input.reason,
        metadata: input.metadata,
      },
    });
  }

  return {
    booking: await tx.booking.findUniqueOrThrow({
      where: { id: input.bookingId },
    }),
    applied: true,
  };
}

export class BookingStateConflictError extends Error {
  constructor(public readonly bookingId: string) {
    super(`Booking ${bookingId} changed while the command was being applied`);
    this.name = "BookingStateConflictError";
  }
}
