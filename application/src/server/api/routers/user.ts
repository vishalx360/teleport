import { z } from "zod";

import {
  addressSchema,
  bookingSchema,
  locationModalSchema,
  userRoleSchema,
} from "@/components/validationSchema";
import {
  createTRPCRouter,
  customerProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  BookingStatus,
  PaymentStatus,
  VehicleClass,
} from "@/generated/prisma/enums";
import { getDistanceAndDuration } from "@/lib/geoUtils";
import { quoteBooking } from "@/server/services/pricing";
import { getStripe, StripeConfigurationError } from "@/lib/stripe";
import { env } from "@/env";
import {
  applyBookingCommand,
  BookingStateConflictError,
  InvalidBookingTransitionError,
} from "@/server/services/bookingTransitions";
import { createHash, randomUUID } from "node:crypto";
import {
  reconcileBookingTimeout,
  reconcileCustomerBookingTimeouts,
} from "@/server/services/bookingTimeouts";

const NEARBY_DRIVER_RADIUS_METERS = 12_000;
const NEARBY_DRIVER_LIMIT = 12;
const NEARBY_DRIVER_CANDIDATES_PER_CLASS = 25;
const TERMINAL_BOOKING_STATUSES = [
  BookingStatus.DELIVERED,
  BookingStatus.CANCELLED,
  BookingStatus.FAILED,
];

function coarseCoordinate(value: number) {
  // About 110 metres at the equator. The idle map is an availability hint,
  // not a live-tracking surface, so exact driver positions stay private.
  return Math.round(value * 1_000) / 1_000;
}

export const userRouter = createTRPCRouter({
  getNearbyDrivers: customerProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .query(async ({ ctx, input }) => {
      const activeBooking = await ctx.db.booking.count({
        where: {
          userId: ctx.session.user.id,
          status: { notIn: TERMINAL_BOOKING_STATUSES },
          paymentStatus: {
            in: [PaymentStatus.AUTHORIZED, PaymentStatus.PAID],
          },
        },
      });

      if (activeBooking > 0) return { visible: false, drivers: [] };

      const candidates = (
        await Promise.all(
          Object.values(VehicleClass).map(async (vehicleClass) => {
            const locations = (await ctx.redis.georadius(
              `DRIVER_LOCATIONS:${vehicleClass}`,
              input.longitude,
              input.latitude,
              NEARBY_DRIVER_RADIUS_METERS,
              "m",
              "WITHCOORD",
              "ASC",
              "COUNT",
              NEARBY_DRIVER_CANDIDATES_PER_CLASS,
            )) as unknown as Array<[string, [string, string]]>;

            return locations.map(([driverId, coordinates]) => ({
              driverId,
              vehicleClass,
              longitude: Number(coordinates[0]),
              latitude: Number(coordinates[1]),
            }));
          }),
        )
      ).flat();

      const uniqueCandidates = Array.from(
        new Map(
          candidates.map((candidate) => [candidate.driverId, candidate]),
        ).values(),
      );
      if (uniqueCandidates.length === 0) return { visible: true, drivers: [] };

      const availability = await ctx.redis
        .pipeline(
          uniqueCandidates.map(({ driverId }) => [
            "get",
            `DRIVER_AVAILABILITY:${driverId}`,
          ]),
        )
        .exec();

      const drivers = uniqueCandidates
        .filter((_, index) => availability?.[index]?.[1] === "true")
        .map(({ driverId, vehicleClass, latitude, longitude }) => ({
          id: createHash("sha256").update(driverId).digest("hex").slice(0, 12),
          vehicleClass,
          latitude: coarseCoordinate(latitude),
          longitude: coarseCoordinate(longitude),
        }))
        .slice(0, NEARBY_DRIVER_LIMIT);

      return { visible: true, drivers };
    }),
  getActivity: protectedProcedure.query(async ({ ctx }) => {
    const isDriver = ctx.session.user.role === "DRIVER";
    if (!isDriver) await reconcileCustomerBookingTimeouts(ctx.session.user.id);

    return ctx.db.booking.findMany({
      where: isDriver
        ? { driverId: ctx.session.user.id }
        : { userId: ctx.session.user.id },
      include: {
        deliveryAddress: {
          select: { id: true, nickname: true, address: true },
        },
        pickupAddress: {
          select: { id: true, nickname: true, address: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
  pusherChannelAuth: protectedProcedure
    .input(
      z.object({
        socketId: z.string(),
        channelName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const channel = /^private-(booking|driver|user)-([a-z0-9]+)$/.exec(
        input.channelName,
      );
      if (!channel) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This realtime channel is not supported",
        });
      }
      const [, channelName, key] = channel;
      if (channelName === "booking") {
        const isMember = await ctx.db.booking.count({
          where: {
            id: key,
            OR: [
              { userId: ctx.session.user.id },
              { driverId: ctx.session.user.id },
            ],
          },
        });
        if (isMember === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not allowed to access this channel",
          });
        }
      }
      if (
        channelName === "driver" &&
        (ctx.session.user.role !== "DRIVER" || key !== ctx.session.user.id)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to access this driver channel",
        });
      }
      if (channelName === "user" && key !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to access this user channel",
        });
      }
      const response = ctx.pusher.authorizeChannel(
        input.socketId,
        input.channelName,
      );
      return response;
    }),
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

  makeBooking: customerProcedure
    .input(bookingSchema)
    .mutation(async ({ ctx, input }) => {
      let stripe;
      try {
        stripe = getStripe();
      } catch (error) {
        if (error instanceof StripeConfigurationError) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: error.message,
          });
        }
        throw error;
      }
      const addresses = await ctx.db.address.findMany({
        where: {
          id: { in: [input.pickupAddressId, input.deliveryAddressId] },
          userId: ctx.session.user.id,
        },
      });
      if (addresses.length !== 2) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only book with your own addresses",
        });
      }
      const pickupAddress = addresses.find(
        (address) => address.id === input.pickupAddressId,
      )!;
      const deliveryAddress = addresses.find(
        (address) => address.id === input.deliveryAddressId,
      )!;
      const route = await getDistanceAndDuration(
        pickupAddress,
        deliveryAddress,
      );
      if (!route) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A route could not be calculated",
        });
      }
      const quote = quoteBooking({
        vehicleClass: input.vehicleClass,
        distanceMeters: Math.round(Number(route.distance) * 1_000),
        durationSeconds: Math.round(route.duration * 60),
      });
      const booking = await ctx.db.$transaction(async (tx) => {
        const created = await tx.booking.create({
          data: {
            vehicleClass: input.vehicleClass,
            userId: ctx.session.user.id,
            deliveryAddressId: input.deliveryAddressId,
            pickupAddressId: input.pickupAddressId,
            ...quote,
          },
          include: { deliveryAddress: true, pickupAddress: true },
        });
        return created;
      });
      let session;
      try {
        session = await stripe.checkout.sessions.create(
          {
            mode: "payment",
            client_reference_id: booking.id,
            customer_email: ctx.session.user.email ?? undefined,
            metadata: { bookingId: booking.id },
            line_items: [
              {
                price_data: {
                  currency: booking.currency.toLowerCase(),
                  product_data: { name: "Teleport delivery" },
                  unit_amount: booking.totalAmount,
                },
                quantity: 1,
              },
            ],
            success_url: `${env.NEXTAUTH_URL}/booking/${booking.id}?payment=success`,
            cancel_url: `${env.NEXTAUTH_URL}/new-booking/checkout?payment=cancelled`,
            expires_at: Math.floor(Date.now() / 1_000) + 30 * 60,
          },
          { idempotencyKey: `booking-checkout-${booking.id}` },
        );
      } catch (error) {
        await ctx.db.booking.deleteMany({
          where: { id: booking.id, stripeCheckoutSessionId: null },
        });
        console.error(
          "Stripe checkout session creation failed",
          error instanceof Error ? error.message : "Unknown Stripe error",
        );
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            "Stripe could not start the payment. Check the test key and try again.",
        });
      }
      if (!session.url)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a checkout URL",
        });
      await ctx.db.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: { stripeCheckoutSessionId: session.id },
        });
        await applyBookingCommand(tx, {
          bookingId: booking.id,
          commandId: `stripe-checkout:${session.id}`,
          command: "PAYMENT_PROCESSING",
          actorId: ctx.session.user.id,
        });
      });
      return { bookingId: booking.id, checkoutUrl: session.url };
    }),
  rebook: customerProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findFirst({
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
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Create a new booking to request another delivery",
      });
    }),

  getBooking: customerProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      await reconcileBookingTimeout(input, ctx.session.user.id);
      const booking = await ctx.db.booking.findUnique({
        where: {
          id: input,
          userId: ctx.session.user.id,
        },
        include: {
          deliveryAddress: true,
          pickupAddress: true,
          driver: true,
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
        lastEta: Awaited<ReturnType<typeof getDistanceAndDuration>> | null;
        lastUpdatedDriverLocation: {
          longitude: number;
          latitude: number;
        } | null;
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
      }
      return returnData;
    }),
  getAllBookings: customerProcedure.query(async ({ ctx }) => {
    await reconcileCustomerBookingTimeouts(ctx.session.user.id);
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
    });
    if (!bookings) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
    }
    return bookings;
  }),
  cancelBooking: customerProcedure
    .input(
      z.object({
        bookingId: z.string(),
        commandId: z
          .string()
          .uuid()
          .default(() => randomUUID()),
        reason: z.string().min(3).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.$transaction(async (tx) => {
          const owned = await tx.booking.count({
            where: { id: input.bookingId, userId: ctx.session.user.id },
          });
          if (owned !== 1)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Booking not found",
            });
          await applyBookingCommand(tx, {
            bookingId: input.bookingId,
            commandId: input.commandId,
            command: "CUSTOMER_CANCELLED",
            actorId: ctx.session.user.id,
            reason: input.reason,
          });
        });
      } catch (error) {
        if (
          error instanceof InvalidBookingTransitionError ||
          error instanceof BookingStateConflictError
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This booking can no longer be cancelled",
          });
        }
        throw error;
      }
      await ctx.pusher.trigger(`private-booking-${input.bookingId}`, "UPDATE", {
        message: "Booking cancelled",
      });
      return { message: "Booking cancelled" };
    }),
  retryMatching: customerProcedure
    .input(
      z.object({
        bookingId: z.string(),
        commandId: z
          .string()
          .uuid()
          .default(() => randomUUID()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db.$transaction(async (tx) => {
          const owned = await tx.booking.count({
            where: { id: input.bookingId, userId: ctx.session.user.id },
          });
          if (owned !== 1)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Booking not found",
            });
          const transition = await applyBookingCommand(tx, {
            bookingId: input.bookingId,
            commandId: input.commandId,
            command: "RETRY_MATCHING",
            actorId: ctx.session.user.id,
          });
          if (transition.applied) {
            await tx.outboxEvent.create({
              data: {
                topic: "BOOKINGS",
                eventType: "booking.matching_requested.v1",
                key: input.bookingId,
                payload: {
                  bookingId: input.bookingId,
                  attempt: transition.booking.matchingAttempt,
                  occurredAt: new Date().toISOString(),
                },
              },
            });
          }
          return transition;
        });
        await ctx.pusher.trigger(
          `private-booking-${input.bookingId}`,
          "UPDATE",
          {
            message: "Searching for a driver again",
          },
        );
        return {
          message: "Matching restarted",
          attempt: result.booking.matchingAttempt,
        };
      } catch (error) {
        if (
          error instanceof InvalidBookingTransitionError ||
          error instanceof BookingStateConflictError
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This booking cannot restart matching",
          });
        }
        throw error;
      }
    }),
  saveAddress: protectedProcedure
    .input(addressSchema)
    .mutation(async ({ ctx, input }) => {
      const address = await ctx.db.address.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });

      return { message: "Address saved successfully", address };
    }),

  getAddresses: protectedProcedure.query(async ({ ctx }) => {
    const addresses = await ctx.db.address.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });

    return addresses;
  }),

  deleteAddress: customerProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.address.deleteMany({
        where: { id: input, userId: ctx.session.user.id },
      });
      if (deleted.count !== 1)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        });
      return { message: "Address deleted" };
    }),

  updateAddress: customerProcedure
    .input(locationModalSchema)
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.address.updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: input,
      });
      if (updated.count !== 1)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        });
      return { message: "Address updated" };
    }),
});
