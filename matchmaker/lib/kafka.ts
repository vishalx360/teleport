import { Kafka, Partitioners } from "kafkajs"
import { env } from "./env";

/** The only durable event stream owned by the matchmaking service. */
export const KAFKA_TOPICS = {
    bookingEvents: "BOOKINGS",
} as const;

export const KAFKA_CONSUMER_GROUPS = {
    matchmaking: "matchmaking-group",
} as const;

const sasl = env.KAFKA_API_KEY && env.KAFKA_API_SECRET
    ? { mechanism: "plain" as const, username: env.KAFKA_API_KEY, password: env.KAFKA_API_SECRET }
    : undefined;

const kafka = new Kafka({
    clientId: 'matchmaker',
    brokers: [env.KAFKA_URL.replace(/^https?:\/\//, "")],
    // Local Kafka is plaintext; managed Kafka supplies credentials and TLS.
    ssl: Boolean(sasl),
    sasl,
})

export async function getProducer() {
    // Pin KafkaJS's current partitioner so local development does not emit a
    // migration warning and per-booking keys stay consistently partitioned.
    const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    return producer;
}

export async function getConsumer({ groupId }: { groupId: string }) {
    const consumer = kafka.consumer({
        groupId
    });
    return consumer;
}
