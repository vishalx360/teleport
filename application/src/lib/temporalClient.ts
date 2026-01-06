import { Client, Connection } from "@temporalio/client";
import { env } from "@/env";

let temporalClient: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (temporalClient) {
    return temporalClient;
  }

  const connection = await Connection.connect({
    address: env.TEMPORAL_ADDRESS,
  });

  temporalClient = new Client({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
  });

  return temporalClient;
}

// Workflow and signal type definitions
export const MATCHMAKING_WORKFLOW = "matchmakingWorkflow";
export const MATCHMAKING_TASK_QUEUE = "matchmaking-queue";

// Signal names
export const DRIVER_RESPONSE_SIGNAL = "driverResponse";

// Signal payload types
export interface DriverResponseSignal {
  driverId: string;
  accepted: boolean;
}

// Workflow input types
export interface MatchmakingWorkflowInput {
  bookingId: string;
  userId: string;
  vehicleClass: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryLatitude: number;
  deliveryLongitude: number;
  price: number;
  distance: number;
  duration: number;
  pickupAddress: {
    id: string;
    nickname: string;
    address: string;
    contactName: string;
    mobile: string;
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    id: string;
    nickname: string;
    address: string;
    contactName: string;
    mobile: string;
    latitude: number;
    longitude: number;
  };
}

