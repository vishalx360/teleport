import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    REDIS_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    PUSHER_APP_ID: z.string(),
    PUSHER_SECRET: z.string(),
    PUSHER_CLUSTER: z.string(),
    PUSHER_KEY: z.string(),
    PUSHER_HOST: z.string().optional(),
    PUSHER_PORT: z.coerce.number().optional(),
    PUSHER_USE_TLS: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .default(process.env.NODE_ENV === "production" ? "true" : "false"),

    KAFKA_URL: z.string(),
    KAFKA_API_KEY: z.string().optional(),
    KAFKA_API_SECRET: z.string().optional(),
    DATABASE_URL: z.string().url(),
    TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
    TEMPORAL_NAMESPACE: z.string().default("default"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
