import { env } from "@/env";
import { Kafka } from "kafkajs"

const kafka = new Kafka({
    clientId: 'application',
    brokers: [env.KAFKA_URL],
    ssl: true,
    sasl: {
        mechanism: 'plain',
        username: env.KAFKA_API_KEY,
        password: env.KAFKA_API_SECRET
    }
})

export async function getProducer() {
    const producer = kafka.producer();
    return producer;
}

export async function getConsumer({ groupId }: { groupId: string }) {
    const consumer = kafka.consumer({
        groupId
    });
    return consumer;
}