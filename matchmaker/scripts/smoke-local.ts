import "dotenv/config";

import { db } from "../lib/db";
import { redisClient } from "../lib/redis";
import { getTemporalClient } from "../lib/temporal";

async function main() {
  const customer = await db.query<{ id: string }>('SELECT "id" FROM "User" WHERE "email" = $1', ["customer.local@teleport.test"]);
  const driver = await db.query<{ id: string }>('SELECT "id" FROM "User" WHERE "email" = $1', ["driver.local@teleport.test"]);
  if (!customer.rows[0] || !driver.rows[0]) throw new Error("Local personas are missing; run pnpm setup:local");
  await redisClient.ping();
  await getTemporalClient();
  console.log("Local smoke check passed: customer, driver, Redis, and Temporal are ready.");
  await redisClient.quit();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
