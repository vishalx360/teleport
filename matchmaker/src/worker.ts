import { NativeConnection, Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";

import { env } from "../lib/env";
import * as activities from "./activities";

export async function runTemporalWorker() {
  const connection = await NativeConnection.connect({
    address: env.TEMPORAL_ADDRESS,
  });
  const worker = await Worker.create({
    workflowsPath: fileURLToPath(
      new URL("./workflows/index.ts", import.meta.url),
    ),
    activities,
    taskQueue: "booking-matchmaking",
    namespace: env.TEMPORAL_NAMESPACE,
    connection,
  });

  await worker.run();
}
