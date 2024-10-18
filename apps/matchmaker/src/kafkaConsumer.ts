import { Kafka } from "kafkajs";
import { env } from './env';

export const kafka = new Kafka({
    clientId: 'my-app',
    brokers: [env.KAFKA_URL]
});


export const consumer = kafka.consumer({ groupId: 'matchmaking-group' });
