import { runTemporalWorker } from "./worker";

runTemporalWorker().catch((error) => {
  console.error("Temporal worker failed", error);
  process.exitCode = 1;
});
