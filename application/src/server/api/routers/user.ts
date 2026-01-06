import { z } from "zod";

import {
  addressSchema,
  bookingSchema,
  locationModalSchema,
  userRoleSchema,
} from "@/components/validationSchema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { BookingStatus, type VehicleClass } from "@prisma/client";
import { getDistanceAndDuration } from "@/lib/geoUtils";
import {
  MATCHMAKING_WORKFLOW,
  MATCHMAKING_TASK_QUEUE,
  type MatchmakingWorkflowInput,
} from "@/lib/temporalClient";

export const userRouter = createTRPCRouter({
  setRole: protectedProcedure
    .input(userRoleSchema)
    .mutation(async ({ ctx, input }) => {
      console.log(input);
      const user = await ctx.db.user.findUnique({
        where: {
          id: ctx.session.user.id,
        },
      });
      if (!user) {
        return { message: "User not found" };
      }
      if (user.role !== null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Role already set",
        });
      }
      console.log(input);
      await ctx.db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          role: input.role,
          vehicleClass: input.vehicleClass
            ? (input.vehicleClass as VehicleClass)
            : null,
        },
      });
      return { message: "Role updated successfully" };
    }),

  makeBooking: protectedProcedure
    .input(bookingSchema)
    .mutation(async ({ ctx, input }) => {
      // Create booking in database
      const booking = await ctx.db.booking.create({
        data: {
          vehicleClass: input.vehicleClass as VehicleClass,
          userId: ctx.session.user.id,
          distance: input.distance,
          deliveryAddressId: input.deliveryAddressId,
          pickupAddressId: input.pickupAddressId,
          price: input.price,
          duration: input.duration,
        },
        include: {
          deliveryAddress: true,
          pickupAddress: true,
        },
      });

      // Start Temporal workflow for matchmaking
      const temporalClient = await ctx.getTemporalClient();
      const workflowInput: MatchmakingWorkflowInput = {
        bookingId: booking.id,
        userId: ctx.session.user.id,
        vehicleClass: booking.vehicleClass,
        pickupLatitude: booking.pickupAddress.latitude,
        pickupLongitude: booking.pickupAddress.longitude,
        deliveryLatitude: booking.deliveryAddress.latitude,
        deliveryLongitude: booking.deliveryAddress.longitude,
        price: booking.price,
        distance: booking.distance,
        duration: booking.duration,
        pickupAddress: {
          id: booking.pickupAddress.id,
          nickname: booking.pickupAddress.nickname,
          address: booking.pickupAddress.address,
          contactName: booking.pickupAddress.contactName,
          mobile: booking.pickupAddress.mobile,
          latitude: booking.pickupAddress.latitude,
          longitude: booking.pickupAddress.longitude,
        },
        deliveryAddress: {
          id: booking.deliveryAddress.id,
          nickname: booking.deliveryAddress.nickname,
          address: booking.deliveryAddress.address,
          contactName: booking.deliveryAddress.contactName,
          mobile: booking.deliveryAddress.mobile,
          latitude: booking.deliveryAddress.latitude,
          longitude: booking.deliveryAddress.longitude,
        },
      };

      await temporalClient.workflow.start(MATCHMAKING_WORKFLOW, {
        taskQueue: MATCHMAKING_TASK_QUEUE,
        workflowId: `matchmaking-${booking.id}`,
        args: [workflowInput],
      });

      return booking;
    }),

  rebook: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findUnique({
        where: {
          id: input,
          userId: ctx.session.user.id,
        },
        include: {
          deliveryAddress: true,
          pickupAddress: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      // Reset booking status
      await ctx.db.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.BOOKED, driverId: null },
      });

      // Start Temporal workflow for matchmaking
      const temporalClient = await ctx.getTemporalClient();
      const workflowInput: MatchmakingWorkflowInput = {
        bookingId: booking.id,
        userId: ctx.session.user.id,
        vehicleClass: booking.vehicleClass,
        pickupLatitude: booking.pickupAddress.latitude,
        pickupLongitude: booking.pickupAddress.longitude,
        deliveryLatitude: booking.deliveryAddress.latitude,
        deliveryLongitude: booking.deliveryAddress.longitude,
        price: booking.price,
        distance: booking.distance,
        duration: booking.duration,
        pickupAddress: {
          id: booking.pickupAddress.id,
          nickname: booking.pickupAddress.nickname,
          address: booking.pickupAddress.address,
          contactName: booking.pickupAddress.contactName,
          mobile: booking.pickupAddress.mobile,
          latitude: booking.pickupAddress.latitude,
          longitude: booking.pickupAddress.longitude,
        },
        deliveryAddress: {
          id: booking.deliveryAddress.id,
          nickname: booking.deliveryAddress.nickname,
          address: booking.deliveryAddress.address,
          contactName: booking.deliveryAddress.contactName,
          mobile: booking.deliveryAddress.mobile,
          latitude: booking.deliveryAddress.latitude,
          longitude: booking.deliveryAddress.longitude,
        },
      };

      await temporalClient.workflow.start(MATCHMAKING_WORKFLOW, {
        taskQueue: MATCHMAKING_TASK_QUEUE,
        workflowId: `matchmaking-${booking.id}-${Date.now()}`,
        args: [workflowInput],
      });

      return booking;
    }),

  getBooking: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      // Allow both user and driver to view the booking
      const booking = await ctx.db.booking.findFirst({
        where: {
          id: input,
          OR: [
            { userId: ctx.session.user.id },
            { driverId: ctx.session.user.id },
          ],
        },
        include: {
          deliveryAddress: true,
          pickupAddress: true,
          driver: true,
          user: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
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
      if (booking.driverId) {
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
      }
      return returnData;
    }),

  getAllBookings: protectedProcedure.query(async ({ ctx }) => {
    const bookings = await ctx.db.booking.findMany({
      where: {
        userId: ctx.session.user.id,
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    if (!bookings) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
    }
    return bookings;
  }),

  saveAddress: protectedProcedure
    .input(addressSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.address.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });

      return { message: "Address saved successfully" };
    }),

  getAddresses: protectedProcedure.query(async ({ ctx }) => {
    const addresses = await ctx.db.address.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });

    console.log(addresses);

    return addresses;
  }),

  deleteAddress: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.address.delete({
        where: {
          id: input,
        },
      });
    }),

  updateAddress: protectedProcedure
    .input(locationModalSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.address.update({
        where: {
          id: input.id,
        },
        data: input,
      });
    }),

  cancelBooking: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findUnique({
        where: {
          id: input,
          userId: ctx.session.user.id,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      // Only allow cancellation before pickup
      const cancellableStatuses = [
        BookingStatus.BOOKED,
        BookingStatus.ACCEPTED,
        BookingStatus.ARRIVED,
      ];

      if (!cancellableStatuses.includes(booking.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel booking after pickup",
        });
      }

      // Update booking status to cancelled
      await ctx.db.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });

      // Cancel the Temporal workflow if it exists
      try {
        const temporalClient = await ctx.getTemporalClient();
        const handle = temporalClient.workflow.getHandle(
          `matchmaking-${booking.id}`,
        );
        await handle.cancel();
      } catch {
        // Workflow may not exist or already completed, ignore
      }

      return { message: "Booking cancelled successfully" };
    }),
});
