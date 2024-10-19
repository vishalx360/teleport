import { getProducer } from "@repo/lib/newKafka";

export const kafkaProducer = async (topic: string, message: unknown) => {
  const producer = await getProducer();
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  await producer.disconnect();
};
