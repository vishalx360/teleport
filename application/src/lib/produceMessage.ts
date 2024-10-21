import { getProducer } from "./kafka";

export const produceMessage = async (topic: string, message: unknown) => {
  const producer = await getProducer();
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  await producer.disconnect();
};
