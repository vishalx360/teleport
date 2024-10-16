import { env } from "@/env";
import PusherServer from "pusher";


export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,

  host: env.NEXT_PUBLIC_PUSHER_URL,
  port: env.NEXT_PUBLIC_PUSHER_PORT,
});

