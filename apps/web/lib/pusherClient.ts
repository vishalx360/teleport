import { env } from "@/env";
import { rawClient } from "@/trpc/raw-client";
import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  userAuthentication: {
    customHandler: ({ socketId }, callback) => {
      rawClient.user.pusherUserAuth
        .mutate(socketId)
        .then((response) => {
          console.log("Pusher User Authentication Success", response);
          callback(null, response);
        })
        .catch((error) => {
          console.error("Authentication Error Details:", error);
          callback(new Error("Authentication failed"), null);
        });
    },
  },
  channelAuthorization: {
    customHandler: ({ socketId, channelName }, callback) => {
      rawClient.user.pusherChannelAuth
        .mutate({
          channelName,
          socketId,
        })
        .then((response) => {
          console.log("Channel Authentication Success", response);
          callback(null, response);
        })
        .catch((error) => {
          callback(new Error("Channel Authentication failed"), null);
        });
    },
  },
});

pusherClient.signin();

pusherClient.bind("pusher:signin_success", (data: any) => {
  console.log("pusher:signin_success", JSON.parse(data.user_data));
});
pusherClient.bind("pusher:error", (data: any) => {
  console.error("pusher:error", data);
});

pusherClient.bind("pusher:subscription_succeeded", (data: any) => {
  console.log("pusher:subscription_succeeded", JSON.parse(data.user_data));
});
pusherClient.bind("pusher:subscription_error", (data: any) => {
  console.error("pusher:subscription_error", data);
});
