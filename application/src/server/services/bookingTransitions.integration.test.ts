import assert from "node:assert/strict";
import test from "node:test";

import { db } from "@/lib/db";
import { applyBookingCommand } from "./bookingTransitions";

test("booking transitions are atomic, audited, and idempotent", async (context) => {
  const customer = await db.user.findFirst({
    where: { role: "USER", addresses: { some: {} } },
    include: { addresses: { take: 1 } },
  });
  assert.ok(customer?.addresses[0], "local seed customer and address are required");

  const booking = await db.booking.create({
    data: {
      userId: customer.id,
      pickupAddressId: customer.addresses[0].id,
      deliveryAddressId: customer.addresses[0].id,
      vehicleClass: "BIKE",
      distanceMeters: 1_000,
      durationSeconds: 600,
      subtotalAmount: 10_000,
      totalAmount: 10_000,
    },
  });
  context.after(async () => {
    await db.booking.deleteMany({ where: { id: booking.id } });
    await db.$disconnect();
  });

  const processing = await db.$transaction((tx) =>
    applyBookingCommand(tx, {
      bookingId: booking.id,
      commandId: "integration-checkout",
      command: "PAYMENT_PROCESSING",
      actorId: customer.id,
    }),
  );
  assert.equal(processing.applied, true);
  assert.equal(processing.booking.stateVersion, 1);

  const duplicate = await db.$transaction((tx) =>
    applyBookingCommand(tx, {
      bookingId: booking.id,
      commandId: "integration-checkout",
      command: "PAYMENT_PROCESSING",
      actorId: customer.id,
    }),
  );
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.booking.stateVersion, 1);

  await db.$transaction((tx) =>
    applyBookingCommand(tx, {
      bookingId: booking.id,
      commandId: "integration-payment",
      command: "PAYMENT_SUCCEEDED",
      actorId: customer.id,
    }),
  );
  const unavailable = await db.$transaction((tx) =>
    applyBookingCommand(tx, {
      bookingId: booking.id,
      commandId: "integration-no-driver",
      command: "NO_DRIVER_FOUND",
    }),
  );
  assert.equal(unavailable.booking.paymentStatus, "PAID");
  assert.equal(unavailable.booking.dispatchStatus, "NO_DRIVER_FOUND");

  const retried = await db.$transaction((tx) =>
    applyBookingCommand(tx, {
      bookingId: booking.id,
      commandId: "integration-retry",
      command: "RETRY_MATCHING",
      actorId: customer.id,
    }),
  );
  assert.equal(retried.booking.dispatchStatus, "SEARCHING");
  assert.equal(retried.booking.matchingAttempt, 2);
  assert.equal(retried.booking.stateVersion, 4);

  const stateEvents = await db.bookingStateEvent.findMany({
    where: { bookingId: booking.id },
  });
  assert.equal(stateEvents.length, 5);
});
