import 'dotenv/config';

import { processBooking } from './processBooking';
import { Kafka } from "kafkajs";
import { env } from './env';

export const kafka = new Kafka({
    clientId: 'my-app',
    brokers: [env.KAFKA_URL]
});

export const consumer = kafka.consumer({ groupId: 'matchmaking-group' });


async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({
        topic: 'BOOKINGS',
        fromBeginning: true
    });
    await consumer.run({
        autoCommit: false,
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
}

// Start the Kafka consumer
startConsumer().catch(console.error);
