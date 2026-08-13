import { db } from "../lib/db";
import { getProducer } from "../lib/kafka";

const POLL_INTERVAL_MS = 1_000;
const BATCH_SIZE = 25;

export async function runOutboxRelay() {
  const producer = await getProducer();
  await producer.connect();

  for (;;) {
    const claimed = await db.query<{ id: string; topic: string; eventType: string; key: string; payload: unknown }>(
      `UPDATE "OutboxEvent" SET "status" = 'PROCESSING', "lockedAt" = NOW(), "attempts" = "attempts" + 1
       WHERE "id" IN (SELECT "id" FROM "OutboxEvent"
         WHERE ("status" = 'PENDING' OR ("status" = 'PROCESSING' AND "lockedAt" < NOW() - INTERVAL '5 minutes'))
           AND "availableAt" <= NOW()
         ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT ${BATCH_SIZE})
       RETURNING "id", "topic", "eventType", "key", "payload"`,
    );
    const events = claimed.rows;
    if (events.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    const byTopic = new Map<string, typeof events>();
    for (const event of events) {
      const topicEvents = byTopic.get(event.topic) ?? [];
      topicEvents.push(event);
      byTopic.set(event.topic, topicEvents);
    }
    for (const [topic, topicEvents] of byTopic) {
      const ids = topicEvents.map(({ id }) => id);
      try {
        await producer.send({
          topic,
          messages: topicEvents.map((event) => ({
            key: event.key,
            value: JSON.stringify(event.payload),
            headers: { eventId: event.id, eventType: event.eventType },
          })),
        });
        await db.query(`UPDATE "OutboxEvent" SET "status" = 'PUBLISHED', "publishedAt" = NOW(), "lastError" = NULL WHERE "id" = ANY($1::text[])`, [ids]);
      } catch (error) {
        await db.query(
          `UPDATE "OutboxEvent"
           SET "status" = 'PENDING',
               "availableAt" = NOW() + make_interval(secs => LEAST(300, 5 * power(2, LEAST("attempts", 6))::int)),
               "lastError" = $2
           WHERE "id" = ANY($1::text[])`,
          [ids, error instanceof Error ? error.message : "Kafka publication failed"],
        );
      }
    }
  }
}
