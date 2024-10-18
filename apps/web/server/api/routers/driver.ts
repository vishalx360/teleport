
import { availablitySchema, bookingLocationSchema, locationSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { z } from "zod";
import { BookingStatus } from "@repo/database";

export const driverRouter = createTRPCRouter({
  setAvailablity: protectedProcedure
    .input(availablitySchema)
    .mutation(async ({ ctx, input }) => {
      if (!input.available) {
        await ctx.redis.del(`DRIVER_AVAILABILITY:${ctx.session.user.id}`);
        await ctx.redis.zrem(`DRIVER_LOCATIONS:${ctx.session.user.vehicleClass}`, ctx.session.user.id);
        return { message: "Updated Availablity successfully", available: false };
      }
      await ctx.redis.set(
        `DRIVER_AVAILABILITY:${ctx.session.user.id}`,
        'true',
        "EX", 30 * 60);
      return { message: "Updated Availablity successfully", available: true };
    }),

  updateLocation: protectedProcedure
    .input(bookingLocationSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.redis.geoadd(
        `DRIVER_LOCATIONS:${ctx.session.user.vehicleClass}`,
        input.longitude,
        input.latitude,
        ctx.session.user.id
      );
      if (input.bookingId) {
        const channelName = `booking-${input.bookingId}`;

        await ctx.pusher.trigger(channelName, 'DRIVER_LOCATION', {
          longitude: input.longitude,
          latitude: input.latitude,
        });
      }
      return { message: "Updated Location successfully" };
    }),

  getAvailablity: protectedProcedure
    .query(async ({ ctx }) => {
      const available = await ctx.redis.get(`DRIVER_AVAILABILITY:${ctx.session.user.id}`);
      return { available: available === 'true' };
    }),

  bookingResponse: protectedProcedure
    .input(z.object({
      bookingId: z.string(),
      accepted: z.boolean(),
      channel: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { bookingId, accepted, channel } = input;
      if (accepted) {
        await ctx.db.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.ACCEPTED, driverId: ctx.session.user.id },
        });
        // stop the matching process
        await ctx.pusher.trigger(bookingId, 'UPDATE', { message: accepted ? 'Booking accepted' : 'Booking rejected' });
      }
      // stop the matching process for this driver
      await ctx.redis.set(`DRIVER_REJECTED:${ctx.session.user.id}:${bookingId}`, 'true', 'EX', 5 * 60);
      await ctx.redis.set(channel, accepted ? 'accepted' : 'rejected', "EX", 5 * 60);

      return { message: "Response sent" };
    }),
  getCurrentBooking: protectedProcedure
    .query(async ({ ctx }) => {
      const booking = await ctx.db.booking.findFirst({
        where: {
          driverId: ctx.session.user.id,
          status: BookingStatus.ACCEPTED,
        },
        include: {
          pickupAddress: true,
          deliveryAddress: true,
          user: true,
        }
      });

      return booking;
    }),
});
