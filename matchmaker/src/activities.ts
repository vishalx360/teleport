import { randomUUID } from "node:crypto";

import { db } from "../lib/db";
import { pusherServer } from "../lib/pusher";
import { redisClient } from "../lib/redis";
import type { BookingForMatch, DriverOffer } from "./workflows/types";
import { applyMatchmakerCommand } from "./bookingTransitions";

const RADIUS_TO_SEARCH_METERS = 10_000;
const MAX_DRIVER_CANDIDATES = 25;

const offerKey = (bookingId: string) => `MATCHING_OFFER:${bookingId}`;
const busyKey = (driverId: string) => `DRIVER_BUSY:${driverId}`;

export async function loadBookingForMatch({
  bookingId,
  attempt,
}: {
  bookingId: string;
  attempt: number;
}): Promise<BookingForMatch | null> {
  const result = await db.query<BookingForMatch>(
    `SELECT b."id", b."status", b."matchingAttempt", b."vehicleClass", b."distanceMeters", b."durationSeconds", b."totalAmount", b."currency",
            json_build_object('latitude', p."latitude", 'longitude', p."longitude", 'nickname', p."nickname", 'address', p."address") AS "pickupAddress",
            json_build_object('latitude', d."latitude", 'longitude', d."longitude", 'nickname', d."nickname", 'address', d."address") AS "deliveryAddress"
     FROM "Booking" b
     JOIN "Address" p ON p."id" = b."pickupAddressId"
     JOIN "Address" d ON d."id" = b."deliveryAddressId"
     WHERE b."id" = $1
       AND b."paymentStatus" = 'PAID'
       AND b."dispatchStatus" = 'SEARCHING'
       AND b."fulfillmentStatus" = 'NOT_STARTED'
       AND b."matchingAttempt" = $2`,
    [bookingId, attempt],
  );
  return result.rows[0] ?? null;
}

export async function findAvailableDriverIds(booking: BookingForMatch) {
  const drivers = (await redisClient.georadius(
    `DRIVER_LOCATIONS:${booking.vehicleClass}`,
    booking.pickupAddress.longitude,
    booking.pickupAddress.latitude,
    RADIUS_TO_SEARCH_METERS,
    "m",
    "WITHDIST",
    "ASC",
    "COUNT",
    MAX_DRIVER_CANDIDATES,
  )) as [string, string][];

  // One Redis round trip filters the nearby candidates instead of issuing one
  // GET per driver as the market grows.
  const availability = await redisClient
    .pipeline(
      drivers.map(([driverId]) => ["get", `DRIVER_AVAILABILITY:${driverId}`]),
    )
    .exec();
  return drivers
    .filter((_, index) => availability?.[index]?.[1] === "true")
    .map(([driverId]) => driverId);
}

export async function createDriverOffer({
  booking,
  driverId,
  timeoutSeconds,
}: {
  booking: BookingForMatch;
  driverId: string;
  timeoutSeconds: number;
}): Promise<DriverOffer | null> {
  const responseToken = randomUUID();
  const reserved = await redisClient.set(
    busyKey(driverId),
    booking.id,
    "EX",
    timeoutSeconds,
    "NX",
  );
  if (reserved !== "OK") return null;

  const offer = { driverId, responseToken };
  const offerStored = await redisClient.set(
    offerKey(booking.id),
    JSON.stringify(offer),
    "EX",
    timeoutSeconds,
    "NX",
  );
  if (offerStored !== "OK") {
    await redisClient.del(busyKey(driverId));
    return null;
  }

  try {
    await pusherServer.trigger(
      `private-driver-${driverId}`,
      "driver-booking-request",
      {
        booking,
        acceptBefore: new Date(Date.now() + timeoutSeconds * 1_000),
        responseToken,
      },
    );
  } catch (error) {
    // Do not leave a driver artificially busy when realtime delivery fails.
    await releaseDriverOffer({
      bookingId: booking.id,
      driverId,
      responseToken,
    });
    throw error;
  }

  return offer;
}

export async function releaseDriverOffer({
  bookingId,
  driverId,
  responseToken,
}: {
  bookingId: string;
  driverId: string;
  responseToken: string;
}) {
  const offer = await redisClient.get(offerKey(bookingId));
  if (offer === JSON.stringify({ driverId, responseToken })) {
    await redisClient.del(offerKey(bookingId));
  }
  if ((await redisClient.get(busyKey(driverId))) === bookingId) {
    await redisClient.del(busyKey(driverId));
  }
}

export async function claimBooking({
  bookingId,
  driverId,
}: {
  bookingId: string;
  driverId: string;
}) {
  const claimed = await applyMatchmakerCommand({
    bookingId,
    commandId: `driver-assigned:${driverId}`,
    command: "DRIVER_ASSIGNED",
    driverId,
    actorId: driverId,
  });
  if (!claimed) return false;

  await pusherServer.trigger(`private-booking-${bookingId}`, "UPDATE", {
    message: "Booking accepted",
  });
  return true;
}

export async function failBooking({
  bookingId,
  attempt,
}: {
  bookingId: string;
  attempt: number;
}) {
  const failed = await applyMatchmakerCommand({
    bookingId,
    commandId: `no-driver:${bookingId}:${attempt}`,
    command: "NO_DRIVER_FOUND",
    reason: "No available driver accepted the offer",
  });
  if (failed) {
    await pusherServer.trigger(`private-booking-${bookingId}`, "UPDATE", {
      message: "No driver is currently available",
    });
  }
}

const PAYMENT_TIMEOUT_MS = 30 * 60 * 1_000;
const MATCHING_TIMEOUT_MS = 10 * 60 * 1_000;

/**
 * Safety-net reconciliation for deadlines that must fire even when Stripe
 * webhooks are delayed and no customer currently has the booking page open.
 */
export async function reconcileAutomaticBookingTimeouts() {
  const result = await db.query<{
    id: string;
    paymentStatus: string;
    dispatchStatus: string;
    createdAt: Date;
    stateChangedAt: Date;
  }>(
    `SELECT "id", "paymentStatus", "dispatchStatus", "createdAt", "stateChangedAt"
       FROM "Booking"
      WHERE ("paymentStatus" IN ('PENDING', 'PROCESSING', 'AUTHORIZED')
             AND "createdAt" <= NOW() - INTERVAL '30 minutes')
         OR ("paymentStatus" = 'PAID'
             AND "dispatchStatus" = 'SEARCHING'
             AND "stateChangedAt" <= NOW() - INTERVAL '10 minutes')
      ORDER BY "createdAt"
      LIMIT 100`,
  );

  let applied = 0;
  for (const booking of result.rows) {
    const paymentTimedOut = ["PENDING", "PROCESSING", "AUTHORIZED"].includes(
      booking.paymentStatus,
    );
    const deadlineAt = new Date(
      paymentTimedOut
        ? new Date(booking.createdAt).getTime() + PAYMENT_TIMEOUT_MS
        : new Date(booking.stateChangedAt).getTime() + MATCHING_TIMEOUT_MS,
    );
    try {
      const changed = await applyMatchmakerCommand({
        bookingId: booking.id,
        commandId: `timeout:${paymentTimedOut ? "PAYMENT" : "MATCHING"}:${deadlineAt.toISOString()}`,
        command: paymentTimedOut ? "PAYMENT_FAILED" : "NO_DRIVER_FOUND",
        reason: paymentTimedOut
          ? "Payment window expired"
          : "Matching deadline expired",
      });
      if (changed) applied += 1;
    } catch (error) {
      // Another webhook, workflow, or user action may win this race. The next
      // scan observes the authoritative state, so an invalid transition is safe.
      console.warn("Timeout reconciliation skipped a changed booking", {
        bookingId: booking.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { scanned: result.rowCount ?? 0, applied };
}
