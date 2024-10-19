import { z } from "zod";

export const sharedEnvTypes = {
    server: {
        DATABASE_URL: z.string().url(),
        REDIS_URL: z.string().url(),
        NODE_ENV: z
            .enum(["development", "test", "production"])
            .default("development"),
        PUSHER_APP_ID: z.string(),
        PUSHER_SECRET: z.string(),
        ZOOKEEPER_URL: z.string().optional(),
        KAFKA_URL: z.string(),
        KAFKA_API_KEY: z.string(),
        KAFKA_API_SECRET: z.string(),
    },
    client: {
        NEXT_PUBLIC_PUSHER_KEY: z.string(),
        // NEXT_PUBLIC_PUSHER_URL: z.string(),
        NEXT_PUBLIC_PUSHER_CLUSTER: z.string(),
        // NEXT_PUBLIC_PUSHER_PORT: z.string(),
        NEXT_PUBLIC_MAPBOX_TOKEN: z.string(),
    },
};