import "dotenv/config";
import ConfluentKafka from "@confluentinc/kafka-javascript";
const { Kafka } = ConfluentKafka.KafkaJS;
import { env } from "./env";

// Read configuration from environment variables
const config = {
    kafkaJS: {
        brokers: [env.KAFKA_URL],
        ssl: true,
        sasl: {
            mechanism: "plain",
            username: env.KAFKA_API_KEY,
            password: env.KAFKA_API_SECRET,
        },
    },
    "auto.offset.reset": "earliest",
}

export async function getProducer() {
    const producer = new Kafka(config).producer();
    return producer;
}

export async function getConsumer({ groupId }) {
    const consumer = new Kafka(config).consumer({
        "group.id": groupId,
    });
    return consumer;
}

// async function produce(topic, message) {
//     const key = "key";
//     const value = "value";

//     const producer = await getProducer(config);

//     // send a single message
//     const produceRecord = await producer.send({
//         topic,
//         messages: [{ key, value }],
//     });
//     console.log(
//         `\n\n Produced message to topic ${topic}: key = ${key}, value = ${value}, ${JSON.stringify(
//             produceRecord,
//             null,
//             2
//         )} \n\n`
//     );

//     // disconnect the producer
//     await producer.disconnect();
// }

// async function consume(topic, config) {
//     const consumer = await getConsumer(config);

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

