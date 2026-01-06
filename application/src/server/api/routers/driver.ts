import {
  availablitySchema,
  bookingLocationSchema,
} from "@/components/validationSchema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { getDistanceAndDuration } from "@/lib/geoUtils";
import { DRIVER_RESPONSE_SIGNAL, type DriverResponseSignal } from "@/lib/temporalClient";

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
        const booking = await ctx.db.booking.findUnique({
          where: { id: input.bookingId },
          select: {
            pickupAddress: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
            deliveryAddress: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
            status: true,
            userId: true,
          },
        });

        if (!booking) {
          return { message: "Updated Location successfully" };
        }

        const pickupCoordinates = {
          latitude: booking.pickupAddress.latitude,
          longitude: booking.pickupAddress.longitude,
        };
        const deliveryCoordinates = {
          latitude: booking.deliveryAddress.latitude,
          longitude: booking.deliveryAddress.longitude,
        };
        const driverCoordinates = {
          latitude: input.latitude,
          longitude: input.longitude,
        };

        // Publish driver location update via Redis PubSub
        await ctx.publishNotification({
          channel: `booking:${input.bookingId}`,
          event: "DRIVER_LOCATION",
          data: {
            longitude: input.longitude,
            latitude: input.latitude,
          },
        });

        // Calculate and publish ETA update
        let eta = null;
        switch (booking?.status) {
          case BookingStatus.ACCEPTED:
            eta = await getDistanceAndDuration(pickupCoordinates, driverCoordinates);
            break;
          case BookingStatus.PICKED_UP:
          case BookingStatus.IN_TRANSIT:
            eta = await getDistanceAndDuration(driverCoordinates, deliveryCoordinates);
            break;
        }

        if (eta) {
          await ctx.publishNotification({
            channel: `booking:${input.bookingId}`,
            event: "ETA_UPDATE",
            data: eta,
          });
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { bookingId, accepted } = input;

      // Send signal to Temporal workflow
      const temporalClient = await ctx.getTemporalClient();
      const workflowId = `matchmaking-${bookingId}`;

      try {
        const handle = temporalClient.workflow.getHandle(workflowId);
        const signal: DriverResponseSignal = {
          driverId: ctx.session.user.id,
          accepted,
        };
        await handle.signal(DRIVER_RESPONSE_SIGNAL, signal);
      } catch (error) {
        console.error(`Failed to signal workflow ${workflowId}:`, error);
        // Workflow might have completed or not exist - that's okay
      }

      return { message: "Response sent" };
    }),

  updateBookingStatus: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        status: z.enum(["ARRIVED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { bookingId, status } = input;

      // Verify the driver owns this booking
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: bookingId,
          driverId: ctx.session.user.id,
        },
      });

      if (!booking) {
        throw new Error("Booking not found or not assigned to this driver");
      }

      // Update booking status
      await ctx.db.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus[status] },
      });

      // Publish status update via Redis PubSub
      await ctx.publishNotification({
        channel: `booking:${bookingId}`,
        event: "STATUS_UPDATE",
        data: { status, message: `Booking status updated to ${status}` },
      });

      return { message: "Status updated successfully" };
    }),

  getCurrentBooking: protectedProcedure.query(async ({ ctx }) => {
    const booking = await ctx.db.booking.findFirst({
      where: {
        driverId: ctx.session.user.id,
        status: {
          in: [
            BookingStatus.ACCEPTED,
            BookingStatus.ARRIVED,
            BookingStatus.PICKED_UP,
            BookingStatus.IN_TRANSIT,
            BookingStatus.DELIVERED,
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
      lastEta: { distance: number; duration: number } | null;
      lastUpdatedDriverLocation: { longitude: string; latitude: string } | null;
    } = {
      booking,
      lastEta: null,
      lastUpdatedDriverLocation: null,
    };

    const [lastUpdatedDriverLocation] = await ctx.redis.geopos(
      `DRIVER_LOCATIONS:${booking.vehicleClass}`,
      booking.driverId,
    );

    if (lastUpdatedDriverLocation) {
      const driverCoordinates = {
        longitude: lastUpdatedDriverLocation[0],
        latitude: lastUpdatedDriverLocation[1],
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
    }

    return returnData;
  }),

  getAllBookings: protectedProcedure.query(async ({ ctx }) => {
    const bookings = await ctx.db.booking.findMany({
      where: {
        driverId: ctx.session.user.id,
      },
      include: {
        deliveryAddress: {
          select: {
            id: true,
            nickname: true,
            address: true,
          },
        },
        pickupAddress: {
          select: {
            id: true,
            nickname: true,
            address: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return bookings;
  }),
});
