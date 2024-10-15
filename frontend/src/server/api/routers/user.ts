import { z } from "zod";

import { locationModalSchema, locationSchema, userRoleSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
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
  saveAddress: protectedProcedure
    .input(locationSchema)
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
