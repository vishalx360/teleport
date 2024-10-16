import 'dotenv/config';
import { kafka } from "@utils/kafka";


const consumer = kafka.consumer({ groupId: 'matchmaking-group' });

async function startConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'BOOKINGS', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (message.value) {
                const bookingData = JSON.parse(message.value.toString());
                console.log(bookingData);
                // await processBooking(bookingData);
            }
        },
    });
}


// Start the Kafka consumer
startConsumer().catch(console.error);
