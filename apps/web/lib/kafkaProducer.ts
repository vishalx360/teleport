import { env } from "@/env";
import { Kafka, type Producer } from "kafkajs";

export const kafka = new Kafka({
    clientId: 'my-app',
    brokers: [env.KAFKA_URL]
});

const producer: Producer = kafka.producer();

export const kafkaProducer = async (topic: string, message: unknown) => {
    await producer.connect();
    await producer.send({
        topic,
        messages: [
            { value: JSON.stringify(message) },
        ],
    });
    await producer.disconnect();
};