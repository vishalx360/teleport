import { continueAsNew, proxyActivities, sleep } from "@temporalio/workflow";

const activities = proxyActivities<{
  reconcileAutomaticBookingTimeouts(): Promise<{
    scanned: number;
    applied: number;
  }>;
}>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 5 },
});

const SCAN_INTERVAL_MS = 60_000;
const SCANS_BEFORE_CONTINUE_AS_NEW = 24 * 60;

/** A singleton durable monitor for automatic, pre-custody booking deadlines. */
export async function bookingTimeoutMonitorWorkflow(
  scanCount = 0,
): Promise<void> {
  let completedScans = scanCount;
  while (completedScans < SCANS_BEFORE_CONTINUE_AS_NEW) {
    await activities.reconcileAutomaticBookingTimeouts();
    completedScans += 1;
    await sleep(SCAN_INTERVAL_MS);
  }
  await continueAsNew<typeof bookingTimeoutMonitorWorkflow>(0);
}
