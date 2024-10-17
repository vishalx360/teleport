
import { availablitySchema, locationSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";

export const driverRouter = createTRPCRouter({
  setAvailablity: protectedProcedure
    .input(availablitySchema)
    .mutation(async ({ ctx, input }) => {
      console.log(input);
      if (!input.available) {
        await ctx.redis.zrem("AVAILABLE_DRIVERS", ctx.session.user.id);
        return { message: "Updated Availablity successfully", available: false };
      }
      await ctx.redis.geoadd(
        "AVAILABLE_DRIVERS",
        input.location?.longitude,
        input.location.latitude,
        ctx.session.user.id);
      return { message: "Updated Availablity successfully", available: true };
    }),

  getAvailablity: protectedProcedure
    .query(async ({ ctx }) => {
      const location = await ctx.redis.geopos("AVAILABLE_DRIVERS", ctx.session.user.id);
      if (!location) {
        return { available: false };
      }
      return { available: true, location: { latitude: location[1], longitude: location[0] } };
    }),
});
