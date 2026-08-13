import { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const bookingIdSchema = z.object({ bookingId: z.string().cuid() });

async function requireBookingParticipant(
  database: typeof db,
  bookingId: string,
  userId: string,
) {
  const booking = await database.booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ userId }, { driverId: userId }],
    },
    select: {
      id: true,
      userId: true,
      driverId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking not found",
    });
  }

  if (!booking.driverId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Chat becomes available after a driver is assigned",
    });
  }

  return booking;
}

export const chatRouter = createTRPCRouter({
  list: protectedProcedure
    .input(bookingIdSchema)
    .query(async ({ ctx, input }) => {
      await requireBookingParticipant(
        ctx.db,
        input.bookingId,
        ctx.session.user.id,
      );

      const messages = await ctx.db.bookingMessage.findMany({
        where: { bookingId: input.bookingId },
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
          sender: { select: { name: true, role: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 100,
      });

      return messages.reverse().map((message) => ({
        ...message,
        isMine: message.senderId === ctx.session.user.id,
      }));
    }),

  send: protectedProcedure
    .input(
      bookingIdSchema.extend({
        body: z.string().trim().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const booking = await requireBookingParticipant(
        ctx.db,
        input.bookingId,
        ctx.session.user.id,
      );
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.FAILED
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Messages cannot be sent for this closed delivery",
        });
      }

      const message = await ctx.db.bookingMessage.create({
        data: {
          bookingId: input.bookingId,
          senderId: ctx.session.user.id,
          body: input.body,
        },
        select: {
          id: true,
          senderId: true,
          body: true,
          createdAt: true,
          sender: { select: { name: true, role: true } },
        },
      });

      try {
        await ctx.pusher.trigger(
          `private-booking-${input.bookingId}`,
          "CHAT_MESSAGE",
          { messageId: message.id },
        );
      } catch (error) {
        console.error("Failed to publish chat notification", {
          bookingId: input.bookingId,
          messageId: message.id,
          error,
        });
      }

      return { ...message, isMine: true };
    }),
});
