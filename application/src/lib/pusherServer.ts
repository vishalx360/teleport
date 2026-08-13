import { env } from "@/env";
import PusherServer from "pusher";

export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  ...(env.NEXT_PUBLIC_PUSHER_HOST
    ? {
        host: env.NEXT_PUBLIC_PUSHER_HOST,
        port: env.NEXT_PUBLIC_PUSHER_PORT?.toString(),
        useTLS: env.NEXT_PUBLIC_PUSHER_USE_TLS,
      }
    : {}),
});
