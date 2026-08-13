import "dotenv/config";

import { getConsumer, KAFKA_CONSUMER_GROUPS, KAFKA_TOPICS } from "lib/kafka";
import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { getTemporalClient } from "../lib/temporal";
import { runTemporalWorker } from "./worker";
import { runOutboxRelay } from "./outboxRelay";
import type { BookingCreatedEvent } from "./workflows/types";

function isBookingCreatedEvent(value: unknown): value is BookingCreatedEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<BookingCreatedEvent>;
  return Boolean(
    typeof event.bookingId === "string" &&
      typeof event.attempt === "number" &&
      typeof event.occurredAt === "string",
  );
}

function isLegacyBookingCreatedEvent(
  value: unknown,
): value is Omit<BookingCreatedEvent, "attempt"> {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<BookingCreatedEvent>;
  return Boolean(
    typeof event.bookingId === "string" &&
      typeof event.occurredAt === "string" &&
      event.attempt === undefined,
  );
}

async function startBookingConsumer() {
  const consumer = await getConsumer({
    groupId: KAFKA_CONSUMER_GROUPS.matchmaking,
  });
  const temporal = await getTemporalClient();

  await consumer.connect();
  await consumer.subscribe({
    topic: KAFKA_TOPICS.bookingEvents,
    // A new group must process retained events that were published before
    // this process became ready. Once offsets are committed, Kafka resumes
    // from those offsets rather than replaying the topic.
    fromBeginning: true,
  });
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const nextOffset = (Number(message.offset) + 1).toString();
      const eventType = message.headers?.eventType?.toString();
      // The booking topic is an event stream, not a command queue. Ignore future
      // event types here so only an explicit matching request starts a workflow.
      if (
        eventType &&
        eventType !== "booking.matching_requested.v1" &&
        eventType !== "booking.created.v1"
      ) {
        await consumer.commitOffsets([
          { topic, partition, offset: nextOffset },
        ]);
        return;
      }

      if (message.value) {
        const parsed: unknown = JSON.parse(message.value.toString());
        if (
          !isBookingCreatedEvent(parsed) &&
          !isLegacyBookingCreatedEvent(parsed)
        ) {
          throw new Error(
            `Invalid booking.matching_requested.v1 event at ${topic}[${partition}]@${message.offset}`,
          );
        }
        const event = isBookingCreatedEvent(parsed)
          ? parsed
          : { ...parsed, attempt: 1 };
        try {
          await temporal.workflow.start("bookingMatchWorkflow", {
            taskQueue: "booking-matchmaking",
            workflowId: `booking-match-${event.bookingId}-${event.attempt}`,
            args: [event],
          });
        } catch (error) {
          if (!(error instanceof WorkflowExecutionAlreadyStartedError))
            throw error;
        }
      }
      await consumer.commitOffsets([{ topic, partition, offset: nextOffset }]);
    },
  });

  // setup graceful shutdown
  const disconnect = async () => {
    // await consumer.commitOffsets();
    await consumer.disconnect();
  };
  process.on("SIGTERM", disconnect);
  process.on("SIGINT", disconnect);
}

async function ensureBookingTimeoutMonitor() {
  const temporal = await getTemporalClient();
  try {
    await temporal.workflow.start("bookingTimeoutMonitorWorkflow", {
      taskQueue: "booking-matchmaking",
      workflowId: "booking-timeout-monitor-v1",
      args: [],
    });
  } catch (error) {
    if (!(error instanceof WorkflowExecutionAlreadyStartedError)) throw error;
  }
}

async function main() {
  await Promise.all([
    runTemporalWorker(),
    startBookingConsumer(),
    runOutboxRelay(),
    ensureBookingTimeoutMonitor(),
  ]);
}

main().catch(console.error);
