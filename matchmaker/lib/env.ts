import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    REDIS_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Temporal configuration
    TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
    TEMPORAL_NAMESPACE: z.string().default("default"),
    TEMPORAL_TASK_QUEUE: z.string().default("matchmaking-queue"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
