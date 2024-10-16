import { z } from "zod";

import { addressSchema, bookingSchema, locationModalSchema, userRoleSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  testPusher: protectedProcedure
    .mutation(async ({ ctx }) => {
      // const responsex = await ctx.notify({
      //   channel: `user-${ctx.session.user.id}`,
      //   notification: {
      //     message: "Test pusher",
      //     type: "success"
      //   },
      // })
      const response = await ctx.pusher.sendToUser(ctx.session.user.id, "notification", {
        message: "Test pusher",
        type: "success"
      })
      console.log(response);
      return { message: "Pusher test success" };
    }),
  pusherAuth: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      console.log(input);
      const response = await ctx.pusher.authenticateUser(input, {
        id: ctx.session.user.id,
        user_info: ctx.session.user,
      });
      console.log(response)
      return response;
    }),
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
      await ctx.db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          role: input.role,
        },
      });
      return { message: "Role updated successfully" };
    }),

  makeBooking: protectedProcedure
    .input(bookingSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.create({
        data: {
          userId: ctx.session.user.id,
          distance: input.distance,
          deliveryAddressId: input.deliveryAddressId,
          pickupAddressId: input.pickupAddressId,
          price: input.price, // TODO: calculate in backend 
          duration: input.duration, // TODO: calculate in backend
        },
      });
      // TODO put this as task in Kafka 

      return booking;
    }),

  getBooking: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findUnique({
        where: {
          id: input,
          userId: ctx.session.user.id,
        },
      });
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      return booking;
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
