import { Client, Connection } from "@temporalio/client";

import { env } from "./env";

let clientPromise: Promise<Client> | undefined;

export const getTemporalClient = () => {
  clientPromise ??= Connection.connect({ address: env.TEMPORAL_ADDRESS }).then(
    (connection) =>
      new Client({ connection, namespace: env.TEMPORAL_NAMESPACE }),
  );

  return clientPromise;
};
