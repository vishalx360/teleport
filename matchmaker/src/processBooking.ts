// import { db as prisma } from "@utils/db";
import { redisClient as redis } from "@utils/redisClient";
import { pusherServer as pusher } from "@utils/pusherServer";
import { Booking } from "@prisma/client";

const RADIUS_TO_SEARCH = 10 * 1000; // 10km

// Process booking and start matchmaking
async function processBooking(bookingData: Booking) {
    console.log('Processing booking:', bookingData);
    const { id: bookingId, pickupAddress, deliveryAddress, vehicleClass } = bookingData;

    // Get all nearest drivers from Redis based on vehicle type
    // add vehicleid in key
    const drivers = await redis.georadius(
        `DRIVER_LOCATIONS:${vehicleClass}`,
        pickupAddress.longitude,
        pickupAddress.latitude,
        RADIUS_TO_SEARCH, // radius in meters
        'm',
        'WITHDIST',
        'ASC'
    );

    console.log(drivers)
    return

    // Iterate over drivers and start matchmaking
    for (const driver of drivers) {
        const driverId = driver[0];

        // Check if driver is available and not locked
        const isLocked = await redis.get(`DRIVER_BUSY:${driverId}`);
        if (isLocked) continue;

        // Lock the driver for 10 seconds
        await redis.setex(`DRIVER_BUSY:${driverId}`, 10, bookingId);

        // Send notification to the driver
        await sendDriverNotification(driverId, bookingId);

        // Wait for driver's response (simulate with setTimeout or actual implementation)
        const accepted = await waitForDriverResponse(driverId, bookingId);

        if (accepted) {
            // Mark driver as unavailable
            await redis.srem(`available-drivers:${vehicleId}`, driverId);

            // Update booking details
            await prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'accepted', driverId },
            });

            // Notify driver and user
            await notifyDriverAndUser(driverId, bookingData);

            return;
        } else {
            // Unlock the driver and mark unavailable for this booking
            await redis.del(`DRIVER_BUSY:${driverId}`);
            await redis.sadd(`unavailable-for-booking:${bookingId}`, driverId);
        }
    }

    // If no drivers available
    await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'failed' },
    });

    await notifyUserNoDriverAvailable(bookingData);
}

// Notify the driver using Pusher
async function sendDriverNotification(driverId: string, bookingId: string) {
    await pusher.trigger(`private-driver-${driverId}`, 'booking-request', {
        bookingId,
        message: 'New booking request',
    });
}

// Simulate driver response waiting (actual implementation will depend on your application logic)
async function waitForDriverResponse(driverId: string, bookingId: string): Promise<boolean> {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate driver acceptance (true or false)
            const accepted = Math.random() > 0.5;
            resolve(accepted);
        }, 5000);
    });
}

// Notify driver and user of successful booking
async function notifyDriverAndUser(driverId: string, bookingData: any) {
    const userId = bookingData.userId;

    await pusher.trigger(`private-driver-${driverId}`, 'booking-accepted', {
        bookingId: bookingData.bookingId,
        message: 'Booking accepted',
    });

    await pusher.trigger(`private-user-${userId}`, 'booking-update', {
        bookingId: bookingData.bookingId,
        status: 'accepted',
    });
}

// Notify user of no driver availability
async function notifyUserNoDriverAvailable(bookingData: any) {
    const userId = bookingData.userId;

    await pusher.trigger(`private-user-${userId}`, 'booking-update', {
        bookingId: bookingData.bookingId,
        status: 'failed',
        message: 'No drivers available at the moment.',
    });
}

export { processBooking };