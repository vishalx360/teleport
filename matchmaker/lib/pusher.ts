import PusherServer from "pusher";
import { env } from "./env";

export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  cluster: env.PUSHER_CLUSTER,
  key: env.PUSHER_KEY,
  secret: env.PUSHER_SECRET,
});

