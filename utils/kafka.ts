import { Kafka } from 'kafkajs';
import { env } from './env';


export const kafka = new Kafka({
  clientId: 'my-app',
  brokers: [env.KAFKA_URL] // Replace with your Kafka broker addresses
});

