import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import {
  transitionBookingState,
  type BookingCommand,
  type BookingState,
} from "../../shared/bookingStateMachine";
import { db } from "../lib/db";

type BookingStateRow = {
  id: string;
  paymentStatus: BookingState["paymentStatus"];
  dispatchStatus: BookingState["dispatchStatus"];
  fulfillmentStatus: BookingState["fulfillmentStatus"];
  status: BookingState["legacyStatus"];
  stateVersion: number;
  driverId: string | null;
};

interface MatchmakerCommandInput {
  bookingId: string;
  commandId: string;
  command: Extract<
    BookingCommand,
    "PAYMENT_FAILED" | "DRIVER_ASSIGNED" | "NO_DRIVER_FOUND"
  >;
  driverId?: string;
  actorId?: string;
  reason?: string;
}

async function insertStateEvents(
  client: PoolClient,
  input: MatchmakerCommandInput,
  nextVersion: number,
  changes: ReturnType<typeof transitionBookingState>["changes"],
) {
  for (const change of changes) {
    await client.query(
      `INSERT INTO "BookingStateEvent"
        ("id", "bookingId", "commandId", "command", "axis", "fromState", "toState", "version", "actorId", "reason")
       VALUES ($1, $2, $3, $4, $5::"BookingStateAxis", $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        input.bookingId,
        input.commandId,
        input.command,
        change.axis,
        change.fromState,
        change.toState,
        nextVersion,
        input.actorId ?? null,
        input.reason ?? null,
      ],
    );
  }
}

export async function applyMatchmakerCommand(input: MatchmakerCommandInput) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const duplicate = await client.query(
      `SELECT 1 FROM "BookingStateEvent" WHERE "bookingId" = $1 AND "commandId" = $2 LIMIT 1`,
      [input.bookingId, input.commandId],
    );
    if (duplicate.rowCount) {
      await client.query("COMMIT");
      return false;
    }

    const currentResult = await client.query<BookingStateRow>(
      `SELECT "id", "paymentStatus", "dispatchStatus", "fulfillmentStatus", "status", "stateVersion", "driverId"
       FROM "Booking" WHERE "id" = $1 FOR UPDATE`,
      [input.bookingId],
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return false;
    }
    if (
      input.command === "DRIVER_ASSIGNED" &&
      (!input.driverId || current.driverId)
    ) {
      await client.query("ROLLBACK");
      return false;
    }

    const transition = transitionBookingState(
      {
        paymentStatus: current.paymentStatus,
        dispatchStatus: current.dispatchStatus,
        fulfillmentStatus: current.fulfillmentStatus,
        legacyStatus: current.status,
      },
      input.command,
    );
    const nextVersion = current.stateVersion + 1;
    const result = await client.query(
      `UPDATE "Booking"
       SET "paymentStatus" = $2::"PaymentStatus",
           "dispatchStatus" = $3::"DispatchStatus",
           "fulfillmentStatus" = $4::"FulfillmentStatus",
           "status" = $5::"BookingStatus",
           "stateVersion" = "stateVersion" + 1,
           "stateChangedAt" = NOW(),
           "updatedAt" = NOW(),
           "driverId" = CASE WHEN $6::text IS NULL THEN "driverId" ELSE $6 END,
           "acceptedAt" = CASE WHEN $7 = 'DRIVER_ASSIGNED' THEN NOW() ELSE "acceptedAt" END,
           "failureCode" = CASE
             WHEN $7 = 'NO_DRIVER_FOUND' THEN 'NO_DRIVER_AVAILABLE'
             WHEN $7 = 'PAYMENT_FAILED' THEN 'PAYMENT_TIMEOUT_OR_FAILURE'
             ELSE NULL
           END,
           "failedAt" = CASE WHEN $7 IN ('NO_DRIVER_FOUND', 'PAYMENT_FAILED') THEN NOW() ELSE "failedAt" END
       WHERE "id" = $1 AND "stateVersion" = $8`,
      [
        input.bookingId,
        transition.state.paymentStatus,
        transition.state.dispatchStatus,
        transition.state.fulfillmentStatus,
        transition.state.legacyStatus,
        input.driverId ?? null,
        input.command,
        current.stateVersion,
      ],
    );
    if (result.rowCount !== 1) throw new Error("Concurrent booking transition");

    await insertStateEvents(client, input, nextVersion, transition.changes);
    if (transition.state.legacyStatus !== current.status) {
      await client.query(
        `INSERT INTO "BookingEvent" ("id", "bookingId", "fromStatus", "toStatus", "actorId", "reason")
         VALUES ($1, $2, $3::"BookingStatus", $4::"BookingStatus", $5, $6)`,
        [
          randomUUID(),
          input.bookingId,
          current.status,
          transition.state.legacyStatus,
          input.actorId ?? null,
          input.reason ?? null,
        ],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
