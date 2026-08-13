"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pusherClient } from "@/lib/pusherClient";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { MessageSquare, Send } from "lucide-react";
import type { Channel } from "pusher-js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

const messageTime = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

export default function BookingChat({
  bookingId,
  participantName,
  label,
  variant = "full",
  className,
}: {
  bookingId: string;
  participantName: string;
  label: string;
  variant?: "full" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();
  const messages = api.chat.list.useQuery(
    { bookingId },
    { enabled: open, refetchOnWindowFocus: false },
  );
  const sendMessage = api.chat.send.useMutation({
    onSuccess: async () => {
      setBody("");
      await utils.chat.list.invalidate({ bookingId });
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    const channelName = `private-booking-${bookingId}`;
    const channel: Channel = pusherClient.subscribe(channelName);
    const handleMessage = () => {
      if (open) void utils.chat.list.invalidate({ bookingId });
    };
    channel.bind("CHAT_MESSAGE", handleMessage);
    return () => {
      channel.unbind("CHAT_MESSAGE", handleMessage);
    };
  }, [bookingId, open, utils.chat.list]);

  useEffect(() => {
    if (!open || !messages.data) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextBody = body.trim();
    if (!nextBody || sendMessage.isPending) return;
    sendMessage.mutate({ bookingId, body: nextBody });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={variant === "icon" ? label : undefined}
          className={cn(
            variant === "icon"
              ? "grid h-10 w-10 place-items-center rounded-full bg-white/[.06] text-white transition hover:bg-white/10"
              : "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-semibold text-white transition hover:bg-white/[.08]",
            className,
          )}
        >
          <MessageSquare className="h-4 w-4" />
          {variant === "full" && label}
        </button>
      </DialogTrigger>

      <DialogContent className="flex h-[min(680px,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#181a1f] p-0 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-5 pr-12 text-left sm:px-6">
          <DialogTitle className="text-xl text-white">
            {participantName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Messages about this delivery
          </DialogDescription>
        </DialogHeader>

        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6"
          aria-live="polite"
        >
          {messages.isLoading && (
            <p className="py-8 text-center text-sm text-slate-500">
              Loading messages…
            </p>
          )}
          {messages.error && (
            <div className="py-8 text-center">
              <p className="text-sm text-rose-300">Messages could not load.</p>
              <button
                type="button"
                onClick={() => void messages.refetch()}
                className="mt-3 text-sm font-semibold text-blue-300"
              >
                Try again
              </button>
            </div>
          )}
          {messages.data?.length === 0 && (
            <div className="grid min-h-52 place-items-center text-center">
              <div>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <p className="mt-3 font-medium text-white">No messages yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Send a message about pickup or delivery.
                </p>
              </div>
            </div>
          )}
          {messages.data?.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.isMine ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-4 py-2.5",
                  message.isMine
                    ? "rounded-br-md bg-blue-500 text-white"
                    : "rounded-bl-md bg-white/[.07] text-slate-100",
                )}
              >
                {!message.isMine && (
                  <p className="mb-1 text-[10px] font-semibold text-blue-300">
                    {message.sender.name ?? "Delivery participant"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-sm leading-5">
                  {message.body}
                </p>
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    message.isMine ? "text-blue-100" : "text-slate-500",
                  )}
                >
                  {messageTime.format(new Date(message.createdAt))}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={submit}
          className="flex items-end gap-3 border-t border-white/10 bg-[#15171b] p-4 sm:p-5"
        >
          <label htmlFor={`chat-${bookingId}`} className="sr-only">
            Message {participantName}
          </label>
          <textarea
            id={`chat-${bookingId}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={1000}
            rows={1}
            placeholder="Write a message…"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!body.trim() || sendMessage.isPending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
