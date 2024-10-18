import { z } from "zod";

import { addressSchema, bookingSchema, locationModalSchema, userRoleSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type VehicleClass } from "@repo/database";

export const userRouter = createTRPCRouter({
  testPusher: protectedProcedure
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.pusher.trigger("booking", "UPDATE", {
        message: "Booking updated"
      });
      console.log(response);
      return response;
    }),
  pusherUserAuth: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const response = ctx.pusher.authenticateUser(input, {
        id: ctx.session.user.id,
        user_info: ctx.session.user,
      });
      return response;
    }),
  pusherChannelAuth: protectedProcedure
    .input(z.object({
      socketId: z.string(),
      channelName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const response = ctx.pusher.authorizeChannel(input.socketId, input.channelName, {
        user_id: ctx.session.user.id,
        user_info: ctx.session.user,
      });
      return response;
    }
    ),
  setRole: protectedProcedure
    .input(userRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: {
          id: ctx.session.user.id,
        },
      });
      if (!user) {
        return { message: "User not found" };
      }
      if (user.role !== null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Role already set" });
      }
      console.log(input);
      await ctx.db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          role: input.role,
          vehicleClass: input.vehicleClass ? input.vehicleClass as VehicleClass : null,
        },
      });
      return { message: "Role updated successfully" };
    }),

  makeBooking: protectedProcedure
    .input(bookingSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.create({
        data: {
          vehicleClass: input.vehicleClass as VehicleClass,
          userId: ctx.session.user.id,
          distance: input.distance,
          deliveryAddressId: input.deliveryAddressId,
          pickupAddressId: input.pickupAddressId,
          price: input.price, // TODO: calculate in backend 
          duration: input.duration, // TODO: calculate in backend
        },
        include: {
          deliveryAddress: true,
          pickupAddress: true
        }
      });
      await ctx.kafkaProducer("BOOKINGS", booking);
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
          pickupAddress: true
        }
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      await ctx.kafkaProducer("BOOKINGS", booking);
      return booking
    }),

  getBooking: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findUnique({
        where: {
          id: input,
          userId: ctx.session.user.id,
        },
        include: {
          deliveryAddress: true,
          pickupAddress: true,
          driver: true
        }
      });

      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      return booking;
    }),
  getAllBookings: protectedProcedure
    .query(async ({ ctx, input }) => {
      const bookings = await ctx.db.booking.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        include: {
          deliveryAddress: {
            select: {
              id: true,
              nickname: true,
              address: true
            }
          },
          pickupAddress: {
            select: {
              id: true,
              nickname: true,
              address: true
            }
          }
        }
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
});
