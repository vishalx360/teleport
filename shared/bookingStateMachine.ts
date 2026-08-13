export const paymentStates = [
  "PENDING",
  "PROCESSING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUND_PENDING",
  "REFUNDED",
] as const;

export const dispatchStates = [
  "NOT_STARTED",
  "SEARCHING",
  "ASSIGNED",
  "NO_DRIVER_FOUND",
  "CANCELLED",
] as const;

export const fulfillmentStates = [
  "NOT_STARTED",
  "DRIVER_ARRIVING",
  "AT_PICKUP",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export const legacyBookingStates = [
  "BOOKED",
  "ACCEPTED",
  "ARRIVED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
] as const;

export const bookingCommands = [
  "PAYMENT_PROCESSING",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "DRIVER_ASSIGNED",
  "NO_DRIVER_FOUND",
  "RETRY_MATCHING",
  "CUSTOMER_CANCELLED",
  "DRIVER_ARRIVED",
  "PARCEL_PICKED_UP",
  "DELIVERY_STARTED",
  "DELIVERY_COMPLETED",
  "REFUND_REQUESTED",
  "REFUND_COMPLETED",
] as const;

export type PaymentState = (typeof paymentStates)[number];
export type DispatchState = (typeof dispatchStates)[number];
export type FulfillmentState = (typeof fulfillmentStates)[number];
export type LegacyBookingState = (typeof legacyBookingStates)[number];
export type BookingCommand = (typeof bookingCommands)[number];
export type BookingStateAxis = "PAYMENT" | "DISPATCH" | "FULFILLMENT";

export interface BookingState {
  paymentStatus: PaymentState;
  dispatchStatus: DispatchState;
  fulfillmentStatus: FulfillmentState;
  legacyStatus: LegacyBookingState;
}

export interface StateChange {
  axis: BookingStateAxis;
  fromState: string;
  toState: string;
}

export interface TransitionResult {
  state: BookingState;
  changes: StateChange[];
}

export class InvalidBookingTransitionError extends Error {
  constructor(
    public readonly command: BookingCommand,
    public readonly current: BookingState,
  ) {
    super(`Command ${command} is invalid for the current booking state`);
    this.name = "InvalidBookingTransitionError";
  }
}

const withChanges = (
  current: BookingState,
  next: BookingState,
): TransitionResult => ({
  state: next,
  changes: (
    [
      ["PAYMENT", current.paymentStatus, next.paymentStatus],
      ["DISPATCH", current.dispatchStatus, next.dispatchStatus],
      ["FULFILLMENT", current.fulfillmentStatus, next.fulfillmentStatus],
    ] as const
  )
    .filter(([, fromState, toState]) => fromState !== toState)
    .map(([axis, fromState, toState]) => ({ axis, fromState, toState })),
});

const invalid = (command: BookingCommand, current: BookingState): never => {
  throw new InvalidBookingTransitionError(command, current);
};

export function transitionBookingState(
  current: BookingState,
  command: BookingCommand,
): TransitionResult {
  switch (command) {
    case "PAYMENT_PROCESSING":
      if (
        current.paymentStatus !== "PENDING" ||
        current.dispatchStatus !== "NOT_STARTED"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, { ...current, paymentStatus: "PROCESSING" });
    case "PAYMENT_SUCCEEDED":
      if (
        !["PENDING", "PROCESSING", "AUTHORIZED"].includes(
          current.paymentStatus,
        ) ||
        current.dispatchStatus !== "NOT_STARTED"
      )
        return invalid(command, current);
      return withChanges(current, {
        ...current,
        paymentStatus: "PAID",
        dispatchStatus: "SEARCHING",
        legacyStatus: "BOOKED",
      });
    case "PAYMENT_FAILED":
      if (
        !["PENDING", "PROCESSING", "AUTHORIZED"].includes(current.paymentStatus)
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        paymentStatus: "FAILED",
        legacyStatus: "FAILED",
      });
    case "DRIVER_ASSIGNED":
      if (
        current.paymentStatus !== "PAID" ||
        current.dispatchStatus !== "SEARCHING"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        dispatchStatus: "ASSIGNED",
        fulfillmentStatus: "DRIVER_ARRIVING",
        legacyStatus: "ACCEPTED",
      });
    case "NO_DRIVER_FOUND":
      if (
        current.paymentStatus !== "PAID" ||
        current.dispatchStatus !== "SEARCHING"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        dispatchStatus: "NO_DRIVER_FOUND",
        legacyStatus: "FAILED",
      });
    case "RETRY_MATCHING":
      if (
        current.paymentStatus !== "PAID" ||
        current.dispatchStatus !== "NO_DRIVER_FOUND"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        dispatchStatus: "SEARCHING",
        legacyStatus: "BOOKED",
      });
    case "CUSTOMER_CANCELLED":
      if (
        current.dispatchStatus !== "SEARCHING" ||
        current.fulfillmentStatus !== "NOT_STARTED"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        dispatchStatus: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        legacyStatus: "CANCELLED",
      });
    case "DRIVER_ARRIVED":
      if (
        current.dispatchStatus !== "ASSIGNED" ||
        current.fulfillmentStatus !== "DRIVER_ARRIVING"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        fulfillmentStatus: "AT_PICKUP",
        legacyStatus: "ARRIVED",
      });
    case "PARCEL_PICKED_UP":
      if (
        current.dispatchStatus !== "ASSIGNED" ||
        current.fulfillmentStatus !== "AT_PICKUP"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        fulfillmentStatus: "PICKED_UP",
        legacyStatus: "PICKED_UP",
      });
    case "DELIVERY_STARTED":
      if (
        current.dispatchStatus !== "ASSIGNED" ||
        current.fulfillmentStatus !== "PICKED_UP"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        fulfillmentStatus: "IN_TRANSIT",
        legacyStatus: "IN_TRANSIT",
      });
    case "DELIVERY_COMPLETED":
      if (
        current.dispatchStatus !== "ASSIGNED" ||
        current.fulfillmentStatus !== "IN_TRANSIT"
      ) {
        return invalid(command, current);
      }
      return withChanges(current, {
        ...current,
        fulfillmentStatus: "DELIVERED",
        legacyStatus: "DELIVERED",
      });
    case "REFUND_REQUESTED":
      if (
        current.paymentStatus !== "PAID" ||
        ["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(
          current.fulfillmentStatus,
        )
      )
        return invalid(command, current);
      return withChanges(current, {
        ...current,
        paymentStatus: "REFUND_PENDING",
      });
    case "REFUND_COMPLETED":
      if (current.paymentStatus !== "REFUND_PENDING")
        return invalid(command, current);
      return withChanges(current, { ...current, paymentStatus: "REFUNDED" });
  }
}

export function canApplyBookingCommand(
  current: BookingState,
  command: BookingCommand,
) {
  try {
    transitionBookingState(current, command);
    return true;
  } catch (error) {
    if (error instanceof InvalidBookingTransitionError) return false;
    throw error;
  }
}
