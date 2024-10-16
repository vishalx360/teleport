import PusherServer from "pusher";


export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,

  host: process.env.NEXT_PUBLIC_PUSHER_URL,
  port: process.env.NEXT_PUBLIC_PUSHER_PORT,
});

