import { redisClient } from "../../lib/redis";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

// Types
export interface NearbyDriver {
  id: string;
  distance: number;
}

export interface FindNearbyDriversInput {
  vehicleClass: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface CheckDriverAvailabilityInput {
  driverId: string;
  bookingId: string;
}

export interface LockDriverInput {
  driverId: string;
  bookingId: string;
  timeoutSeconds: number;
}

export interface UnlockDriverInput {
  driverId: string;
}

export interface MarkDriverRejectedInput {
  driverId: string;
  bookingId: string;
}

export interface PublishDriverBookingRequestInput {
  driverId: string;
  booking: {
    id: string;
    userId: string;
    vehicleClass: string;
    pickupAddress: {
      id: string;
      nickname: string;
      address: string;
      contactName: string;
      mobile: string;
    };
    deliveryAddress: {
      id: string;
      nickname: string;
      address: string;
      contactName: string;
      mobile: string;
    };
    price: number;
    distance: number;
    duration: number;
  };
  acceptBefore: string;
}

export interface PublishBookingUpdateInput {
  bookingId: string;
  userId: string;
  event: string;
  data: unknown;
}

export interface UpdateBookingStatusInput {
  bookingId: string;
  status: "BOOKED" | "ACCEPTED" | "ARRIVED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "FAILED";
  driverId?: string;
}

/**
 * Find nearby drivers using Redis GEORADIUS
 */
export async function findNearbyDrivers(
  input: FindNearbyDriversInput
): Promise<NearbyDriver[]> {
  console.log(`[Activity] Finding drivers for vehicle class: ${input.vehicleClass}`);

  const results = await redisClient.georadius(
    `DRIVER_LOCATIONS:${input.vehicleClass}`,
    input.longitude,
    input.latitude,
    input.radiusMeters,
    "m",
    "WITHDIST",
    "ASC"
  );

  const drivers: NearbyDriver[] = results.map((result: [string, string]) => ({
    id: result[0],
    distance: parseFloat(result[1]),
  }));

  console.log(`[Activity] Found ${drivers.length} drivers`);
  return drivers;
}

/**
 * Check if a driver is available (not busy, hasn't rejected this booking)
 */
export async function checkDriverAvailability(
  input: CheckDriverAvailabilityInput
): Promise<boolean> {
  // Check if driver is currently busy
  const isBusy = await redisClient.get(`DRIVER_BUSY:${input.driverId}`);
  if (isBusy) {
    console.log(`[Activity] Driver ${input.driverId} is busy`);
    return false;
  }

  // Check if driver has rejected this booking
  const hasRejected = await redisClient.get(
    `DRIVER_REJECTED:${input.driverId}:${input.bookingId}`
  );
  if (hasRejected) {
    console.log(`[Activity] Driver ${input.driverId} has rejected this booking`);
    return false;
  }

  // Check if driver is marked as available
  const isAvailable = await redisClient.get(`DRIVER_AVAILABILITY:${input.driverId}`);
  if (!isAvailable) {
    console.log(`[Activity] Driver ${input.driverId} is not marked as available`);
    return false;
  }

  return true;
}

/**
 * Lock a driver temporarily while waiting for their response
 */
export async function lockDriver(input: LockDriverInput): Promise<void> {
  await redisClient.setex(
    `DRIVER_BUSY:${input.driverId}`,
    input.timeoutSeconds,
    input.bookingId
  );
  console.log(`[Activity] Locked driver ${input.driverId} for ${input.timeoutSeconds}s`);
}

/**
 * Unlock a driver
 */
export async function unlockDriver(input: UnlockDriverInput): Promise<void> {
  await redisClient.del(`DRIVER_BUSY:${input.driverId}`);
  console.log(`[Activity] Unlocked driver ${input.driverId}`);
}

/**
 * Mark a driver as having rejected a specific booking
 */
export async function markDriverRejected(
  input: MarkDriverRejectedInput
): Promise<void> {
  // Mark rejection for 5 minutes
  await redisClient.setex(
    `DRIVER_REJECTED:${input.driverId}:${input.bookingId}`,
    5 * 60,
    "true"
  );
  console.log(`[Activity] Marked driver ${input.driverId} as rejected for booking ${input.bookingId}`);
}

/**
 * Publish a booking request to a driver via Redis PubSub
 */
export async function publishDriverBookingRequest(
  input: PublishDriverBookingRequestInput
): Promise<void> {
  const channel = `driver:${input.driverId}`;
  const message = JSON.stringify({
    event: "BOOKING_REQUEST",
    data: {
      booking: input.booking,
      acceptBefore: input.acceptBefore,
    },
    timestamp: Date.now(),
  });

  await redisClient.publish(channel, message);
  console.log(`[Activity] Published booking request to driver ${input.driverId}`);
}

/**
 * Publish a booking update to a user via Redis PubSub
 */
export async function publishBookingUpdate(
  input: PublishBookingUpdateInput
): Promise<void> {
  const channel = `booking:${input.bookingId}`;
  const message = JSON.stringify({
    event: input.event,
    data: input.data,
    timestamp: Date.now(),
  });

  await redisClient.publish(channel, message);
  console.log(`[Activity] Published ${input.event} to booking ${input.bookingId}`);

  // Also publish to user channel for general notifications
  const userChannel = `user:${input.userId}`;
  await redisClient.publish(userChannel, message);
}

/**
 * Update booking status in the database
 */
export async function updateBookingStatus(
  input: UpdateBookingStatusInput
): Promise<void> {
  const updateData: { status: typeof input.status; driverId?: string } = {
    status: input.status,
  };

  if (input.driverId) {
    updateData.driverId = input.driverId;
  }

  await prisma.booking.update({
    where: { id: input.bookingId },
    data: updateData,
  });

  console.log(`[Activity] Updated booking ${input.bookingId} status to ${input.status}`);
}

