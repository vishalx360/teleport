
import { availablitySchema, locationSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";

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
    .input(locationSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.redis.geoadd(
        `DRIVER_LOCATIONS:${ctx.session.user.vehicleClass}`,
        input.longitude,
        input.latitude,
        ctx.session.user.id
      );
      return { message: "Updated Location successfully" };
    }),

  getAvailablity: protectedProcedure
    .query(async ({ ctx }) => {
      const available = await ctx.redis.get(`DRIVER_AVAILABILITY:${ctx.session.user.id}`);
      return { available: available === 'true' };
    }),
});
