
import { locationSchema } from "@/components/validationSchema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  setAvailablity: protectedProcedure
    .input(locationSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.redis.geoadd("AVAILABLE_DRIVERS", input.longitude, input.latitude, ctx.session.user.id);
      return { message: "Updated Availablity successfully" };
    }),

});
