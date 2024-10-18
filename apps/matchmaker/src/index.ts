import 'dotenv/config';

import { processBooking } from './processBooking';
import { consumer } from './kafkaConsumer';

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

// Start the Kafka consumer
startConsumer().catch(console.error);
