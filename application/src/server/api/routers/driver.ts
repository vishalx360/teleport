import {
  availablitySchema,
  bookingLocationSchema,
  locationSchema,
} from "@/components/validationSchema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { getDistanceAndDuration } from "@/lib/geoUtils";

export const driverRouter = createTRPCRouter({
  setAvailablity: protectedProcedure
    .input(availablitySchema)
    .mutation(async ({ ctx, input }) => {
      if (!input.available) {
        await ctx.redis.del(`DRIVER_AVAILABILITY:${ctx.session.user.id}`);
        await ctx.redis.zrem(
          `DRIVER_LOCATIONS:${ctx.session.user.vehicleClass}`,
          ctx.session.user.id,
        );
        return {
          message: "Updated Availablity successfully",
          available: false,
        };
      }
      await ctx.redis.set(
        `DRIVER_AVAILABILITY:${ctx.session.user.id}`,
        "true",
        "EX",
        30 * 60,
      );
      return { message: "Updated Availablity successfully", available: true };
    }),

  updateLocation: protectedProcedure
    .input(bookingLocationSchema)
    .mutation(async ({ ctx, input }) => {
      console.log(input);
      await ctx.redis.geoadd(
        `DRIVER_LOCATIONS:${ctx.session.user.vehicleClass}`,
        input.longitude,
        input.latitude,
        ctx.session.user.id,
      );
      if (input.bookingId) {
        const channelName = `private-booking-${input.bookingId}`;
        await ctx.pusher.trigger(channelName, "DRIVER_LOCATION", {
          longitude: input.longitude,
          latitude: input.latitude,
        });
        const booking = await ctx.db.booking.findUnique({
          where: { id: input.bookingId },
          select: {
            pickupAddress: {
              select: {
                latitude: true,
                longitude: true
              }
            },
            deliveryAddress: {
              select: {
                latitude: true,
                longitude: true
              },
            },
            status: true
          }
        });
        if (!booking) {
          return { message: "Updated Location successfully" };
        }
        const pickupCoordinates = {
          latitude: booking.pickupAddress.latitude,
          longitude: booking.pickupAddress.longitude
        }
        const deliveryCoordinates = {
          latitude: booking.deliveryAddress.latitude,
          longitude: booking.deliveryAddress.longitude
        }
        const driverCoordinates = {
          latitude: input.latitude,
          longitude: input.longitude
        }
        switch (booking?.status) {
          case BookingStatus.ACCEPTED:
            const etaToPickup = await getDistanceAndDuration(pickupCoordinates, driverCoordinates);
            await ctx.pusher.trigger(channelName, "ETA_UPDATE", etaToPickup);
            break;
          case BookingStatus.PICKED_UP:
          case BookingStatus.IN_TRANSIT:
            const etaToDelivery = await getDistanceAndDuration(driverCoordinates, deliveryCoordinates);
            await ctx.pusher.trigger(channelName, "ETA_UPDATE", etaToDelivery);
            break;
        }
      }
      return { message: "Updated Location successfully" };
    }),

  getAvailablity: protectedProcedure.query(async ({ ctx }) => {
    const available = await ctx.redis.get(
      `DRIVER_AVAILABILITY:${ctx.session.user.id}`,
    );
    return { available: available === "true" };
  }),

  bookingResponse: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        accepted: z.boolean(),
        channel: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { bookingId, accepted, channel } = input;
      if (accepted) {
        await ctx.db.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.ACCEPTED,
            driverId: ctx.session.user.id,
          },
        });
        // stop the matching process
        await ctx.pusher.trigger(bookingId, "UPDATE", {
          message: accepted ? "Booking accepted" : "Booking rejected",
        });
      }
      // stop the matching process for this driver
      await ctx.redis.set(
        `DRIVER_REJECTED:${ctx.session.user.id}:${bookingId}`,
        "true",
        "EX",
        5 * 60,
      );
      await ctx.redis.set(
        channel,
        accepted ? "accepted" : "rejected",
        "EX",
        5 * 60,
      );

      return { message: "Response sent" };
    }),
  getCurrentBooking: protectedProcedure.query(async ({ ctx }) => {
    const booking = await ctx.db.booking.findFirst({
      where: {
        driverId: ctx.session.user.id,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.PICKED_UP, BookingStatus.IN_TRANSIT],
        }
      },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        user: true,
      },
    });

    if (!booking) {
      return null;
    }
    const returnData = {
      booking,
      lastEta: null,
      lastUpdatedDriverLocation: null,
    };

    const [lastUpdatedDriverLocation] = await ctx.redis.geopos(
      `DRIVER_LOCATIONS:${booking.vehicleClass}`,
      booking.driverId,
    );
    const driverCoordinates = {
      longitude: lastUpdatedDriverLocation[0],
      latitude: lastUpdatedDriverLocation[1]
    }
    returnData.lastUpdatedDriverLocation = driverCoordinates

    const pickupCoordinates = {
      latitude: booking.pickupAddress.latitude,
      longitude: booking.pickupAddress.longitude
    }
    const deliveryCoordinates = {
      latitude: booking.deliveryAddress.latitude,
      longitude: booking.deliveryAddress.longitude
    }
    switch (booking?.status) {
      case BookingStatus.ACCEPTED:
        const etaToPickup = await getDistanceAndDuration(pickupCoordinates, driverCoordinates);
        returnData.lastEta = etaToPickup;
        break;
      case BookingStatus.PICKED_UP:
      case BookingStatus.IN_TRANSIT:
        const etaToDelivery = await getDistanceAndDuration(driverCoordinates, deliveryCoordinates);
        returnData.lastEta = etaToDelivery
        break;
    }

    return returnData;
  }),
});