import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";

import type {
  BookingCreatedEvent,
  BookingForMatch,
  DriverOffer,
  DriverResponse,
} from "./types";

const DRIVER_RESPONSE_TIMEOUT_MS = 20_000;

export const driverResponseSignal =
  defineSignal<[DriverResponse]>("driverResponse");

const activities = proxyActivities<{
  loadBookingForMatch(input: {
    bookingId: string;
    attempt: number;
  }): Promise<BookingForMatch | null>;
  findAvailableDriverIds(input: BookingForMatch): Promise<string[]>;
  createDriverOffer(input: {
    booking: BookingForMatch;
    driverId: string;
    timeoutSeconds: number;
  }): Promise<DriverOffer | null>;
  releaseDriverOffer(input: {
    bookingId: string;
    driverId: string;
    responseToken: string;
  }): Promise<void>;
  claimBooking(input: {
    bookingId: string;
    driverId: string;
  }): Promise<boolean>;
  failBooking(input: { bookingId: string; attempt: number }): Promise<void>;
}>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 3 },
});

/**
 * Owns the durable dispatch loop for one booking. External code only communicates
 * through driverResponseSignal; all Redis and Pusher I/O remains in Activities.
 */
export async function bookingMatchWorkflow(event: BookingCreatedEvent) {
  const booking = await activities.loadBookingForMatch({
    bookingId: event.bookingId,
    attempt: event.attempt,
  });
  // A booking may have been cancelled before a retained Kafka event is replayed.
  if (!booking) return { matched: false, reason: "booking_not_matchable" };
  let response: DriverResponse | undefined;
  let activeOffer: DriverOffer | undefined;

  setHandler(driverResponseSignal, (incoming) => {
    if (
      activeOffer &&
      incoming.driverId === activeOffer.driverId &&
      incoming.responseToken === activeOffer.responseToken &&
      !response
    ) {
      response = incoming;
    }
  });

  const driverIds = await activities.findAvailableDriverIds(booking);

  for (const driverId of driverIds) {
    const driverOffer = await activities.createDriverOffer({
      booking,
      driverId,
      timeoutSeconds: DRIVER_RESPONSE_TIMEOUT_MS / 1_000,
    });
    if (!driverOffer) continue;
    activeOffer = driverOffer;

    response = undefined;
    await condition(() => response !== undefined, DRIVER_RESPONSE_TIMEOUT_MS);
    const offer = activeOffer;
    const result = response as DriverResponse | undefined;
    activeOffer = undefined;

    await activities.releaseDriverOffer({
      bookingId: booking.id,
      driverId: offer.driverId,
      responseToken: offer.responseToken,
    });

    if (result?.accepted) {
      const claimed = await activities.claimBooking({
        bookingId: booking.id,
        driverId: result.driverId,
      });
      if (claimed) return { matched: true, driverId: result.driverId };
    }
  }

  await activities.failBooking({
    bookingId: booking.id,
    attempt: booking.matchingAttempt,
  });
  return { matched: false };
}
