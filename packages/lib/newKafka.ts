import { Kafka } from "kafkajs"
import { env } from "./env"

const { KAFKA_API_KEY: username, KAFKA_API_SECRET: password } = env

// This creates a client instance that is configured to connect to the Kafka broker provided by
// the environment variable KAFKA_BOOTSTRAP_SERVER
const kafka = new Kafka({
    clientId: 'my-app',
    brokers: [env.KAFKA_URL],
    ssl: true,
    sasl: {
        mechanism: 'plain',
        username,
        password
    }
})

export async function getProducer() {
    const producer = kafka.producer();
    return producer;
}

export async function getConsumer({ groupId }) {
    const consumer = kafka.consumer({
        groupId
    });
    return consumer;
}

// export const kafkaProducer = async (topic: string, message: unknown) => {
//     const producer = await getProducer();
//     await producer.connect();
//     await producer.send({
//       topic,
//       messages: [{ value: JSON.stringify(message) }],
//     });
//     await producer.disconnect();
//   };
  
// async function consume(topic, config) {
//     const consumer = await getConsumer({groupId:"my-group"});

//     // subscribe to the topic
//     await consumer.subscribe({ topics: [topic] });

//     // consume messages from the topic
//     await consumer.run({
//         eachMessage: async ({ topic, partition, message }) => {
//             console.log(
//                 `Consumed message from topic ${topic}, partition ${partition}: key = ${message.key.toString()}, value = ${message.value.toString()}`
//             );
//         },
//     });

//     // setup graceful shutdown
//     const disconnect = async () => {
//         await consumer.commitOffsets();
//         await consumer.disconnect();
//     };
//     process.on("SIGTERM", disconnect);
//     process.on("SIGINT", disconnect);
// }
