import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
} from "@temporalio/workflow";

import type * as activities from "../activities";

// Proxy activities with retry configuration
const {
  findNearbyDrivers,
  checkDriverAvailability,
  lockDriver,
  unlockDriver,
  markDriverRejected,
  publishDriverBookingRequest,
  publishBookingUpdate,
  updateBookingStatus,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    maximumAttempts: 3,
  },
});

// Signal definitions
export const driverResponseSignal = defineSignal<[DriverResponsePayload]>(
  "driverResponse"
);

// Types
export interface MatchmakingWorkflowInput {
  bookingId: string;
  userId: string;
  vehicleClass: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  price: number;
  distance: number;
  duration: number;
  pickupAddress: {
    id: string;
    nickname: string;
    address: string;
    contactName: string;
    mobile: string;
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    id: string;
    nickname: string;
    address: string;
    contactName: string;
    mobile: string;
    latitude: number;
    longitude: number;
  };
}

export interface DriverResponsePayload {
  driverId: string;
  accepted: boolean;
}

// Configuration
const DRIVER_RESPONSE_TIMEOUT_SECONDS = 20;
const SEARCH_RADIUS_METERS = 10000; // 10km
const MAX_SEARCH_TIME_SECONDS = 120; // Keep searching for 2 minutes before giving up
const SEARCH_RETRY_INTERVAL_SECONDS = 5; // Retry every 5 seconds

export async function matchmakingWorkflow(
  input: MatchmakingWorkflowInput
): Promise<{ matched: boolean; driverId?: string }> {
  console.log(`[Workflow] Starting matchmaking for booking: ${input.bookingId}`);

  // State to track driver response
  let driverResponse: DriverResponsePayload | null = null;
  let currentDriverId: string | null = null;

  // Set up signal handler for driver responses
  setHandler(driverResponseSignal, (response: DriverResponsePayload) => {
    console.log(`[Workflow] Received driver response:`, response);
    if (response.driverId === currentDriverId) {
      driverResponse = response;
    }
  });

  // Notify user that we're searching for drivers
  await publishBookingUpdate({
    bookingId: input.bookingId,
    userId: input.userId,
    event: "SEARCHING",
    data: { message: "Searching for nearby drivers..." },
  });

  const searchStartTime = Date.now();
  const searchEndTime = searchStartTime + MAX_SEARCH_TIME_SECONDS * 1000;
  let searchAttempt = 0;

  // Keep searching for drivers until we find one or time runs out
  while (Date.now() < searchEndTime) {
    searchAttempt++;
    console.log(`[Workflow] Search attempt ${searchAttempt}`);

    // Find nearby drivers
    const drivers = await findNearbyDrivers({
      vehicleClass: input.vehicleClass,
      latitude: input.pickupLatitude,
      longitude: input.pickupLongitude,
      radiusMeters: SEARCH_RADIUS_METERS,
    });

    console.log(`[Workflow] Found ${drivers.length} nearby drivers`);

    if (drivers.length === 0) {
      // No drivers available yet, wait and retry
      const remainingTime = Math.ceil((searchEndTime - Date.now()) / 1000);
      console.log(`[Workflow] No drivers found, retrying in ${SEARCH_RETRY_INTERVAL_SECONDS}s (${remainingTime}s remaining)`);
      
      // Notify user we're still searching
      if (searchAttempt % 3 === 0) {
        await publishBookingUpdate({
          bookingId: input.bookingId,
          userId: input.userId,
          event: "STILL_SEARCHING",
          data: { message: `Still searching for drivers... (${remainingTime}s remaining)` },
        });
      }
      
      await sleep(`${SEARCH_RETRY_INTERVAL_SECONDS}s`);
      continue;
    }

    // Try each driver in order of distance
    for (const driver of drivers) {
      const driverId = driver.id;
      currentDriverId = driverId;
      driverResponse = null;

      console.log(`[Workflow] Trying driver: ${driverId}`);

      // Check if driver is available (not busy, hasn't rejected)
      const isAvailable = await checkDriverAvailability({
        driverId,
        bookingId: input.bookingId,
      });

      if (!isAvailable) {
        console.log(`[Workflow] Driver ${driverId} is not available, skipping`);
        continue;
      }

      // Lock the driver temporarily
      await lockDriver({
        driverId,
        bookingId: input.bookingId,
        timeoutSeconds: DRIVER_RESPONSE_TIMEOUT_SECONDS,
      });

      // Notify user we found a driver
      await publishBookingUpdate({
        bookingId: input.bookingId,
        userId: input.userId,
        event: "DRIVER_FOUND",
        data: { message: "Found a driver, waiting for response..." },
      });

      // Send booking request to driver via Redis PubSub
      await publishDriverBookingRequest({
        driverId,
        booking: {
          id: input.bookingId,
          userId: input.userId,
          vehicleClass: input.vehicleClass,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          price: input.price,
          distance: input.distance,
          duration: input.duration,
        },
        acceptBefore: new Date(
          Date.now() + DRIVER_RESPONSE_TIMEOUT_SECONDS * 1000
        ).toISOString(),
      });

      // Wait for driver response or timeout
      const responded = await condition(
        () => driverResponse !== null,
        `${DRIVER_RESPONSE_TIMEOUT_SECONDS}s`
      );

      if (responded && driverResponse?.accepted) {
        console.log(`[Workflow] Driver ${driverId} accepted booking`);

        // Update booking status to ACCEPTED
        await updateBookingStatus({
          bookingId: input.bookingId,
          status: "ACCEPTED",
          driverId,
        });

        // Notify user that driver accepted
        await publishBookingUpdate({
          bookingId: input.bookingId,
          userId: input.userId,
          event: "ACCEPTED",
          data: { driverId, message: "Driver accepted your booking!" },
        });

        return { matched: true, driverId };
      }

      // Driver rejected or timed out
      console.log(
        `[Workflow] Driver ${driverId} ${responded ? "rejected" : "timed out"}`
      );

      // Unlock driver and mark as rejected for this booking
      await unlockDriver({ driverId });
      await markDriverRejected({ driverId, bookingId: input.bookingId });

      // Notify user we're trying another driver
      await publishBookingUpdate({
        bookingId: input.bookingId,
        userId: input.userId,
        event: "TRYING_ANOTHER",
        data: { message: "Driver unavailable, trying another driver..." },
      });

      // Small delay before trying next driver
      await sleep("500ms");
    }

    // All drivers in this batch rejected/timed out, wait and search again
    const remainingTime = Math.ceil((searchEndTime - Date.now()) / 1000);
    if (remainingTime > SEARCH_RETRY_INTERVAL_SECONDS) {
      console.log(`[Workflow] All current drivers tried, searching again in ${SEARCH_RETRY_INTERVAL_SECONDS}s`);
      await publishBookingUpdate({
        bookingId: input.bookingId,
        userId: input.userId,
        event: "STILL_SEARCHING",
        data: { message: `Looking for more drivers... (${remainingTime}s remaining)` },
      });
      await sleep(`${SEARCH_RETRY_INTERVAL_SECONDS}s`);
    }
  }

  // Time ran out, no driver accepted
  console.log(`[Workflow] No driver found for booking ${input.bookingId} after ${MAX_SEARCH_TIME_SECONDS}s`);

  await updateBookingStatus({
    bookingId: input.bookingId,
    status: "FAILED",
  });

  await publishBookingUpdate({
    bookingId: input.bookingId,
    userId: input.userId,
    event: "NO_DRIVER_FOUND",
    data: { message: "No driver found. Please try again later." },
  });

  return { matched: false };
}
