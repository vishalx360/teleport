import { type Producer } from "kafkajs";
import { kafka } from "@utils/kafka"

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