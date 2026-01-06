import "dotenv/config";

import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";
import { env } from "../lib/env";

async function run() {
  console.log("[Worker] Starting Temporal worker...");
  console.log(`[Worker] Connecting to Temporal at ${env.TEMPORAL_ADDRESS}`);

  // Connect to Temporal server
  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  // Create the worker
  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowsPath: require.resolve("./workflows/matchmaking"),
    activities,
  });

  console.log(`[Worker] Worker started on task queue: ${env.TEMPORAL_TASK_QUEUE}`);

  // Start the worker
  await worker.run();
}

// Setup graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Worker] Received SIGTERM, shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Worker] Received SIGINT, shutting down...");
  process.exit(0);
});

run().catch((err) => {
  console.error("[Worker] Failed to start worker:", err);
  process.exit(1);
});

