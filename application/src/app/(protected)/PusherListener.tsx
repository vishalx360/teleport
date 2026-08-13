"use client";

import { pusherClient } from "@/lib/pusherClient";
import { useSession } from "next-auth/react";
import { type Channel } from "pusher-js";
import { useEffect } from "react";
import { toast } from "sonner";

type UserNotification = {
  type: "success" | "error" | "info" | "warning";
  message: string;
};

function PusherListener() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user.id) return;

    const channelName = `private-user-${session.user.id}`;
    const userChannel: Channel = pusherClient.subscribe(channelName);
    const handleNotification = (data: UserNotification) => {
      toast[data.type](data.message);
    };

    userChannel.bind("notification", handleNotification);
    return () => {
      userChannel.unbind("notification", handleNotification);
      pusherClient.unsubscribe(channelName);
    };
  }, [session?.user.id]);

  return null;
}

export default PusherListener;
