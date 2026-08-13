import { env } from "@/env";
import { rawClient } from "@/trpc/raw-client";
import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  wsHost: env.NEXT_PUBLIC_PUSHER_HOST,
  wsPort: env.NEXT_PUBLIC_PUSHER_PORT,
  forceTLS: env.NEXT_PUBLIC_PUSHER_HOST ? env.NEXT_PUBLIC_PUSHER_USE_TLS : true,
  channelAuthorization: {
    customHandler: ({ socketId, channelName }, callback) => {
      rawClient.user.pusherChannelAuth
        .mutate({
          channelName,
          socketId,
        })
        .then((response) => callback(null, response))
        .catch((error) => {
          console.error("Pusher channel authentication failed", error);
          callback(new Error("Channel Authentication failed"), null);
        });
    },
  },
});
