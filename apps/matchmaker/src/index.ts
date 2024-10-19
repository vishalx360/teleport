import 'dotenv/config';

import { processBooking } from './processBooking';
import { Kafka } from "kafkajs";
import { env } from './env';
import { getConsumer } from '@repo/lib/newKafka';

export const kafka = new Kafka({
    clientId: 'my-app',
    brokers: [env.KAFKA_URL]
});


async function startConsumer() {
    const consumer = await getConsumer({ groupId: 'matchmaking-group' });

    await consumer.connect();
    await consumer.subscribe({
        topic: 'BOOKINGS',
    });
    await consumer.run({
        eachMessage: async ({ topic, partition, message, }) => {
            function commitMessage() {
                consumer.commitOffsets([{ topic, partition, offset: (parseInt(message.offset) + 1).toString() }]);
            }
            if (message.value) {
                const bookingData = JSON.parse(message.value.toString());
                await processBooking(bookingData, commitMessage);
            }
        },
    });

    // setup graceful shutdown
    const disconnect = async () => {
        await consumer.commitOffsets();
        await consumer.disconnect();
    };
    process.on("SIGTERM", disconnect);
    process.on("SIGINT", disconnect);
}

// Start the Kafka consumer
startConsumer().catch(console.error);
