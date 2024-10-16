import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';

// Set up Kafka, Redis, Prisma, and Pusher clients
const kafka = new Kafka({
    clientId: 'matchmaking-service',
    brokers: ['localhost:9092'], // Adjust to your Kafka setup
});

const redis = new Redis({
    host: 'localhost',
    port: 6379,
});

const prisma = new PrismaClient();

const pusher = new Pusher({
    appId: 'YOUR_APP_ID',
    key: 'YOUR_APP_KEY',
    secret: 'YOUR_APP_SECRET',
    cluster: 'YOUR_CLUSTER',
    useTLS: true,
});

// Kafka consumer setup for the BOOKINGS topic
const consumer = kafka.consumer({ groupId: 'matchmaking-group' });

async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'BOOKINGS', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (message.value) {
                const bookingData = JSON.parse(message.value.toString());
                await processBooking(bookingData);
            }
        },
    });
}

// Process booking and start matchmaking
async function processBooking(bookingData: any) {
    const { bookingId, pickup, dropoff, vehicleType } = bookingData;

    // Get all nearest drivers from Redis based on vehicle type
    const drivers = await redis.georadius(
        `drivers:${vehicleType}`,
        pickup.longitude,
        pickup.latitude,
        10000, // radius in meters
        'm',
        'WITHDIST',
        'ASC'
    );

    // Iterate over drivers and start matchmaking
    for (const driver of drivers) {
        const driverId = driver[0];

        // Check if driver is available and not locked
        const isLocked = await redis.get(`driver-lock:${driverId}`);
        if (isLocked) continue;

        // Lock the driver for 10 seconds
        await redis.setex(`driver-lock:${driverId}`, 10, bookingId);

        // Send notification to the driver
        await sendDriverNotification(driverId, bookingId);

        // Wait for driver's response (simulate with setTimeout or actual implementation)
        const accepted = await waitForDriverResponse(driverId, bookingId);

        if (accepted) {
            // Mark driver as unavailable
            await redis.srem(`available-drivers:${vehicleType}`, driverId);

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
            await redis.del(`driver-lock:${driverId}`);
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

// Start the Kafka consumer
startConsumer().catch(console.error);
