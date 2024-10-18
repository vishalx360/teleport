import { redisClient as redis } from "@repo/lib/redisClient";
import { pusherServer as pusher } from "@repo/lib/pusherServer";
import { BookingStatus, Booking } from "@repo/database";



const RADIUS_TO_SEARCH = 10 * 1000; // 10km
const DRIVER_RESPONSE_TIMEOUT = 20; // seconds
const POLLING_INTERVAL = 2000; // 2 seconds

async function processBooking(booking: Booking, commitMessage: () => void) {
    console.log('Processing booking:', booking.id);

    if (!booking) {
        console.log('Booking not found:', booking);
        commitMessage();
        return;
    }
    // if (booking?.status !== BookingStatus.BOOKED) {
    //     commitMessage();
    //     return;
    // }
    const { vehicleClass, pickupAddress, } = booking;
    console.log("finding drivers for vehicle class:", vehicleClass);
    // Get all nearest drivers from Redis based on vehicle type
    const drivers = await redis.georadius(
        `DRIVER_LOCATIONS:${vehicleClass}`,
        pickupAddress.longitude,
        pickupAddress.latitude,
        RADIUS_TO_SEARCH, // radius in meters
        'm',
        'WITHDIST',
        'ASC'
    );

    console.log('Found drivers:', drivers);

    // Notify drivers one by one
    for (const driver of drivers) {
        const driverId = driver[0];

        // Check if the driver is available and not locked
        const isLocked = await redis.get(`DRIVER_BUSY:${driverId}`);
        console.log('Driver:', driverId, 'isLocked:', isLocked);
        if (isLocked) continue;

        // Check if this driver has already rejected this booking
        const hasRejected = await redis.get(`DRIVER_REJECTED:${driverId}:${booking.id}`);
        console.log('Driver:', driverId, 'hasRejected:', hasRejected);
        if (hasRejected) continue;

        // Lock the driver temporarily (e.g., 20 seconds)
        await redis.setex(`DRIVER_BUSY:${driverId}`, DRIVER_RESPONSE_TIMEOUT, booking.id);
        console.log('Driver:', driverId, 'locked for:', DRIVER_RESPONSE_TIMEOUT, 'seconds');
        // Create a unique channel for the driver and booking request
        const secureKey = Math.random().toString(36).substring(7);
        const channel = `booking-response:${booking.id}:${driverId}:${secureKey}`;
        console.log("Sending booking request to driver:", driverId, "on channel:", channel);
        // Send booking request to the driver via WebSocket
        await pusher.sendToUser(driverId, 'driver-booking-request', {
            booking,
            acceptBefore: new Date(Date.now() + DRIVER_RESPONSE_TIMEOUT * 1000),
            channel
        });

        // Wait for the driver's response asynchronously by subscribing to the Redis channel
        const accepted = await pollForDriverResponse(channel, DRIVER_RESPONSE_TIMEOUT);

        if (accepted) {
            commitMessage();
            return;
        }
        // If driver rejected or timeout occurred, unlock the driver and continue
        await redis.del(`DRIVER_BUSY:${driverId}`);
        // mark this driver as rejected for this booking
    }



    commitMessage();  // Commit after all attempts
    return;
}

// Function to poll for driver response via Redis key every 2 seconds
async function pollForDriverResponse(responseKey: string, timeoutSeconds: number) {
    return new Promise((resolve) => {
        let elapsed = 0;

        const interval = setInterval(async () => {
            elapsed += 2;

            // Check if the driver has responded
            const response = await redis.get(responseKey);

            if (response === 'accepted') {
                clearInterval(interval);
                resolve(true);  // Driver accepted
            } else if (response === 'rejected' || elapsed >= timeoutSeconds) {
                clearInterval(interval);
                resolve(false); // Driver rejected or timeout
            }
        }, POLLING_INTERVAL);  // Poll every 2 seconds
    });
}


export { processBooking };