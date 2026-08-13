import {
  availablitySchema,
  bookingLocationSchema,
  locationSchema,
} from "@/components/validationSchema";
import { createTRPCRouter, driverProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/enums";
import { getDistanceAndDuration } from "@/lib/geoUtils";
import { getTemporalClient } from "@/lib/temporal";
import { TRPCError } from "@trpc/server";
import {
  applyBookingCommand,
  BookingStateConflictError,
  InvalidBookingTransitionError,
} from "@/server/services/bookingTransitions";
import { randomUUID } from "node:crypto";

export const driverRouter = createTRPCRouter({
  setAvailablity: driverProcedure
    .input(availablitySchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.vehicleClass) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a vehicle before going online",
        });
      }
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

  updateLocation: driverProcedure
    .input(bookingLocationSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.redis.geoadd(
        `DRIVER_LOCATIONS:${ctx.session.user.vehicleClass}`,
        input.longitude,
        input.latitude,
        ctx.session.user.id,
      );
      // A location update proves an online driver is still alive, without
      // extending availability for a driver who has explicitly gone offline.
      if (await ctx.redis.get(`DRIVER_AVAILABILITY:${ctx.session.user.id}`)) {
        await ctx.redis.expire(
          `DRIVER_AVAILABILITY:${ctx.session.user.id}`,
          30 * 60,
        );
      }
      if (input.bookingId) {
        const assignedBooking = await ctx.db.booking.findFirst({
          where: {
            id: input.bookingId,
            driverId: ctx.session.user.id,
            status: {
              in: [
                BookingStatus.ACCEPTED,
                BookingStatus.ARRIVED,
                BookingStatus.PICKED_UP,
                BookingStatus.IN_TRANSIT,
              ],
            },
          },
          select: {
            pickupAddress: {
              select: { latitude: true, longitude: true },
            },
            deliveryAddress: {
              select: { latitude: true, longitude: true },
            },
            status: true,
          },
        });
        if (!assignedBooking) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This delivery is not assigned to you",
          });
        }
        const channelName = `private-booking-${input.bookingId}`;
        await ctx.pusher.trigger(channelName, "DRIVER_LOCATION", {
          longitude: input.longitude,
          latitude: input.latitude,
        });
        const pickupCoordinates = {
          latitude: assignedBooking.pickupAddress.latitude,
          longitude: assignedBooking.pickupAddress.longitude,
        };
        const deliveryCoordinates = {
          latitude: assignedBooking.deliveryAddress.latitude,
          longitude: assignedBooking.deliveryAddress.longitude,
        };
        const driverCoordinates = {
          latitude: input.latitude,
          longitude: input.longitude,
        };
        switch (assignedBooking.status) {
          case BookingStatus.ACCEPTED:
            const etaToPickup = await getDistanceAndDuration(
              pickupCoordinates,
              driverCoordinates,
            );
            await ctx.pusher.trigger(channelName, "ETA_UPDATE", etaToPickup);
            break;
          case BookingStatus.PICKED_UP:
          case BookingStatus.IN_TRANSIT:
            const etaToDelivery = await getDistanceAndDuration(
              driverCoordinates,
              deliveryCoordinates,
            );
            await ctx.pusher.trigger(channelName, "ETA_UPDATE", etaToDelivery);
            break;
        }
      }
      return { message: "Updated Location successfully" };
    }),

  getAvailablity: driverProcedure.query(async ({ ctx }) => {
    const available = await ctx.redis.get(
      `DRIVER_AVAILABILITY:${ctx.session.user.id}`,
    );
    return { available: available === "true" };
  }),

  bookingResponse: driverProcedure
    .input(
      z.object({
        bookingId: z.string(),
        accepted: z.boolean(),
        responseToken: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { bookingId, accepted } = input;
      const rawOffer = await ctx.redis.get(`MATCHING_OFFER:${bookingId}`);
      if (!rawOffer) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This offer has expired",
        });
      }
      const offer = z
        .object({ driverId: z.string(), responseToken: z.string().uuid() })
        .safeParse(JSON.parse(rawOffer));
      if (
        !offer.success ||
        offer.data.driverId !== ctx.session.user.id ||
        offer.data.responseToken !== input.responseToken
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This offer is not assigned to you",
        });
      }

      const temporal = await getTemporalClient();
      const booking = await ctx.db.booking.findUnique({
        where: { id: bookingId },
        select: { matchingAttempt: true },
      });
      if (!booking)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      const workflow = temporal.workflow.getHandle(
        `booking-match-${bookingId}-${booking.matchingAttempt}`,
      );
      await workflow.signal("driverResponse", {
        driverId: ctx.session.user.id,
        accepted,
        responseToken: input.responseToken,
      });

      return { message: "Response sent" };
    }),
  advanceBooking: driverProcedure
    .input(
      z.object({
        bookingId: z.string(),
        commandId: z
          .string()
          .uuid()
          .default(() => randomUUID()),
        toStatus: z.enum(["ARRIVED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const commands = {
        ARRIVED: "DRIVER_ARRIVED",
        PICKED_UP: "PARCEL_PICKED_UP",
        IN_TRANSIT: "DELIVERY_STARTED",
        DELIVERED: "DELIVERY_COMPLETED",
      } as const;
      try {
        await ctx.db.$transaction(async (tx) => {
          const assigned = await tx.booking.count({
            where: { id: input.bookingId, driverId: ctx.session.user.id },
          });
          if (assigned !== 1)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "This delivery is not assigned to you",
            });
          await applyBookingCommand(tx, {
            bookingId: input.bookingId,
            commandId: input.commandId,
            command: commands[input.toStatus],
            actorId: ctx.session.user.id,
          });
        });
      } catch (error) {
        if (
          error instanceof InvalidBookingTransitionError ||
          error instanceof BookingStateConflictError
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Booking cannot make this transition",
          });
        }
        throw error;
      }
      await ctx.pusher.trigger(`private-booking-${input.bookingId}`, "UPDATE", {
        message: `Booking ${input.toStatus.toLowerCase()}`,
      });
      return { message: "Booking updated" };
    }),
  getCurrentBooking: driverProcedure.query(async ({ ctx }) => {
    const booking = await ctx.db.booking.findFirst({
      where: {
        driverId: ctx.session.user.id,
        status: {
          in: [
            BookingStatus.ACCEPTED,
            BookingStatus.ARRIVED,
            BookingStatus.PICKED_UP,
            BookingStatus.IN_TRANSIT,
          ],
        },
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
    const returnData: {
      booking: typeof booking;
      lastEta: Awaited<ReturnType<typeof getDistanceAndDuration>> | null;
      lastUpdatedDriverLocation: { longitude: number; latitude: number } | null;
    } = {
      booking,
      lastEta: null,
      lastUpdatedDriverLocation: null,
    };

    const [lastUpdatedDriverLocation] = await ctx.redis.geopos(
      `DRIVER_LOCATIONS:${booking.vehicleClass}`,
      ctx.session.user.id,
    );
    if (!lastUpdatedDriverLocation) return returnData;
    const driverCoordinates = {
      longitude: Number(lastUpdatedDriverLocation[0]),
      latitude: Number(lastUpdatedDriverLocation[1]),
    };
    returnData.lastUpdatedDriverLocation = driverCoordinates;

    const pickupCoordinates = {
      latitude: booking.pickupAddress.latitude,
      longitude: booking.pickupAddress.longitude,
    };
    const deliveryCoordinates = {
      latitude: booking.deliveryAddress.latitude,
      longitude: booking.deliveryAddress.longitude,
    };
    switch (booking?.status) {
      case BookingStatus.ACCEPTED:
        const etaToPickup = await getDistanceAndDuration(
          pickupCoordinates,
          driverCoordinates,
        );
        returnData.lastEta = etaToPickup;
        break;
      case BookingStatus.PICKED_UP:
      case BookingStatus.IN_TRANSIT:
        const etaToDelivery = await getDistanceAndDuration(
          driverCoordinates,
          deliveryCoordinates,
        );
        returnData.lastEta = etaToDelivery;
        break;
    }

    return returnData;
  }),
});
