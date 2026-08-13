import assert from "node:assert/strict";
import test from "node:test";

import {
  InvalidBookingTransitionError,
  transitionBookingState,
  type BookingState,
} from "./bookingStateMachine";

const initial: BookingState = {
  paymentStatus: "PENDING",
  dispatchStatus: "NOT_STARTED",
  fulfillmentStatus: "NOT_STARTED",
  legacyStatus: "BOOKED",
};

test("a paid booking enters dispatch without conflating payment and matching", () => {
  const processing = transitionBookingState(
    initial,
    "PAYMENT_PROCESSING",
  ).state;
  const paid = transitionBookingState(processing, "PAYMENT_SUCCEEDED").state;

  assert.equal(paid.paymentStatus, "PAID");
  assert.equal(paid.dispatchStatus, "SEARCHING");
  assert.equal(paid.fulfillmentStatus, "NOT_STARTED");
});

test("a failed or expired payment closes the legacy booking projection", () => {
  const failed = transitionBookingState(initial, "PAYMENT_FAILED").state;
  assert.equal(failed.paymentStatus, "FAILED");
  assert.equal(failed.legacyStatus, "FAILED");
});

test("no-driver outcome preserves successful payment and can be retried", () => {
  const searching: BookingState = {
    ...initial,
    paymentStatus: "PAID",
    dispatchStatus: "SEARCHING",
  };
  const unavailable = transitionBookingState(
    searching,
    "NO_DRIVER_FOUND",
  ).state;
  assert.equal(unavailable.paymentStatus, "PAID");
  assert.equal(unavailable.dispatchStatus, "NO_DRIVER_FOUND");

  const retried = transitionBookingState(unavailable, "RETRY_MATCHING").state;
  assert.equal(retried.paymentStatus, "PAID");
  assert.equal(retried.dispatchStatus, "SEARCHING");
});

test("fulfillment follows the required sequence", () => {
  let state: BookingState = {
    paymentStatus: "PAID",
    dispatchStatus: "SEARCHING",
    fulfillmentStatus: "NOT_STARTED",
    legacyStatus: "BOOKED",
  };
  state = transitionBookingState(state, "DRIVER_ASSIGNED").state;
  state = transitionBookingState(state, "DRIVER_ARRIVED").state;
  state = transitionBookingState(state, "PARCEL_PICKED_UP").state;
  state = transitionBookingState(state, "DELIVERY_STARTED").state;
  state = transitionBookingState(state, "DELIVERY_COMPLETED").state;

  assert.equal(state.fulfillmentStatus, "DELIVERED");
  assert.equal(state.legacyStatus, "DELIVERED");
});

test("out-of-order and post-pickup cancellation commands are rejected", () => {
  assert.throws(
    () => transitionBookingState(initial, "DELIVERY_COMPLETED"),
    InvalidBookingTransitionError,
  );
  assert.throws(
    () =>
      transitionBookingState(
        {
          paymentStatus: "PAID",
          dispatchStatus: "ASSIGNED",
          fulfillmentStatus: "PICKED_UP",
          legacyStatus: "PICKED_UP",
        },
        "CUSTOMER_CANCELLED",
      ),
    InvalidBookingTransitionError,
  );
});

test("refunds cannot start after parcel pickup", () => {
  assert.throws(
    () =>
      transitionBookingState(
        {
          paymentStatus: "PAID",
          dispatchStatus: "ASSIGNED",
          fulfillmentStatus: "IN_TRANSIT",
          legacyStatus: "IN_TRANSIT",
        },
        "REFUND_REQUESTED",
      ),
    InvalidBookingTransitionError,
  );
});
