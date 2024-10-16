import { env } from "@/env";
import { rawClient } from "@/trpc/raw-client";
import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(
  env.NEXT_PUBLIC_PUSHER_KEY,
  {
    cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
    wsHost: env.NEXT_PUBLIC_PUSHER_URL,
    wsPort: Number(env.NEXT_PUBLIC_PUSHER_PORT),
    wssPort: Number(env.NEXT_PUBLIC_PUSHER_PORT),
    httpHost: env.NEXT_PUBLIC_PUSHER_URL,
    httpPort: Number(env.NEXT_PUBLIC_PUSHER_PORT),
    forceTLS: false,
    disableStats: false,
    enabledTransports: ['ws', 'wss'],
    userAuthentication: {
      customHandler: async ({ socketId }, callback) => {
        try {
          const response = await rawClient.user.pusherAuth.mutate(socketId);
          callback(null, {
            auth: response.auth,
            user_data: (response.user_data),
          });
        } catch (error) {
          callback(new Error("Authentication failed"), null);
        }
      },
    }

  }
);

pusherClient.signin();

pusherClient.bind("pusher:signin_success", (data: any) => {
  console.log("pusher:signin_success", JSON.parse(data.user_data))
})
pusherClient.bind("pusher:error", (data: any) => {
  console.error("pusher:error", data)
})

