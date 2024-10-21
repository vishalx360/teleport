import { pusherServer } from "../lib/pusher";
import { redisClient } from "../lib/redis";

const RADIUS_TO_SEARCH = 10 * 1000; // 10km
const DRIVER_RESPONSE_TIMEOUT = 20; // seconds
const POLLING_INTERVAL = 2000; // 2 seconds

async function processBooking(booking: any, commitMessage: () => void) {
    console.log('Processing booking:', booking.id);

    if (!booking) {
        console.log('Booking not found:', booking);
        commitMessage();
        return;
    }
    if (String(booking?.status) !== "BOOKED") {
        commitMessage();
        return;
    }
    const { vehicleClass, pickupAddress } = booking;
    console.log("finding drivers for vehicle class:", vehicleClass);

    const drivers = await redisClient.georadius(
        `DRIVER_LOCATIONS:${vehicleClass}`,
        pickupAddress.longitude,
        pickupAddress.latitude,
        RADIUS_TO_SEARCH,
        'm',
        'WITHDIST',
        'ASC'
    );

    console.log('Found drivers:', drivers);

    for (const driver of drivers) {
        const driverId = driver[0];

        const isLocked = await redisClient.get(`DRIVER_BUSY:${driverId}`);
        console.log('Driver:', driverId, 'isLocked:', isLocked);
        if (isLocked) continue;

        const hasRejected = await redisClient.get(`DRIVER_REJECTED:${driverId}:${booking.id}`);
        console.log('Driver:', driverId, 'hasRejected:', hasRejected);
        if (hasRejected) continue;

        await redisClient.setex(`DRIVER_BUSY:${driverId}`, DRIVER_RESPONSE_TIMEOUT, booking.id);
        console.log('Driver:', driverId, 'locked for:', DRIVER_RESPONSE_TIMEOUT, 'seconds');

        const secureKey = Math.random().toString(36).substring(7);
        const channel = `booking-response:${booking.id}:${driverId}:${secureKey}`;
        console.log("Sending booking request to driver:", driverId, "on channel:", channel);

        await pusherServer.sendToUser(driverId, 'driver-booking-request', {
            booking,
            acceptBefore: new Date(Date.now() + DRIVER_RESPONSE_TIMEOUT * 1000),
            channel
        });

        const accepted = await pollForDriverResponse(channel, DRIVER_RESPONSE_TIMEOUT);

        if (accepted) {
            commitMessage();
            return;
        }

        await redisClient.del(`DRIVER_BUSY:${driverId}`);
    }

    commitMessage();
    return;
}

async function pollForDriverResponse(responseKey: string, timeoutSeconds: number) {
    return new Promise((resolve) => {
        let elapsed = 0;

        const interval = setInterval(async () => {
            elapsed += 2;

            const response = await redisClient.get(responseKey);

            if (response === 'accepted') {
                clearInterval(interval);
                resolve(true);
            } else if (response === 'rejected' || elapsed >= timeoutSeconds) {
                clearInterval(interval);
                resolve(false);
            }
        }, POLLING_INTERVAL);
    });
}

export { processBooking };
