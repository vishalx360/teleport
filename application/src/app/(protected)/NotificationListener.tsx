"use client";

import { api } from "@/trpc/react";
import { toast } from "sonner";

function NotificationListener() {
  // Subscribe to user notifications via SSE
  api.subscriptions.onUserNotification.useSubscription(undefined, {
    onData: (event) => {
      console.log("Notification received:", event);
      if (
        event.data &&
        typeof event.data === "object" &&
        "message" in event.data
      ) {
        const message = event.data.message as string;
        const type =
          "type" in event.data
            ? (event.data.type as "success" | "error")
            : "success";
        toast[type](message);
      }
    },
    onError: (error) => {
      console.error("Notification subscription error:", error);
    },
  });

  return null;
}

export default NotificationListener;

