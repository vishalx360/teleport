import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { redisClient } from "@/lib/redisClient";
import Redis from "ioredis";

// Types for subscription events
interface BookingEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

interface DriverBookingRequest {
  event: "BOOKING_REQUEST";
  data: {
    booking: {
      id: string;
      userId: string;
      vehicleClass: string;
      pickupAddress: {
        id: string;
        nickname: string;
        address: string;
        contactName: string;
        mobile: string;
        latitude: number;
        longitude: number;
      };
      deliveryAddress: {
        id: string;
        nickname: string;
        address: string;
        contactName: string;
        mobile: string;
        latitude: number;
        longitude: number;
      };
      price: number;
      distance: number;
      duration: number;
    };
    acceptBefore: string;
  };
  timestamp: number;
}

/**
 * Create a Redis subscriber for a specific channel pattern
 * Each subscription gets its own Redis connection
 */
function createRedisSubscriber(channel: string): Redis {
  const subscriber = redisClient.duplicate();
  return subscriber;
}

export const subscriptionsRouter = createTRPCRouter({
  /**
   * Subscribe to booking updates (for users tracking their booking)
   */
  onBookingUpdate: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .subscription(({ input, ctx }) => {
      return observable<BookingEvent>((emit) => {
        const channel = `booking:${input.bookingId}`;
        const subscriber = createRedisSubscriber(channel);

        subscriber.subscribe(channel, (err) => {
          if (err) {
            console.error(`Failed to subscribe to ${channel}:`, err);
            emit.error(err);
          }
        });

        subscriber.on("message", (ch, message) => {
          if (ch === channel) {
            try {
              const event = JSON.parse(message) as BookingEvent;
              emit.next(event);
            } catch (e) {
              console.error("Failed to parse message:", e);
            }
          }
        });

        // Cleanup on unsubscribe
        return () => {
          subscriber.unsubscribe(channel);
          subscriber.quit();
        };
      });
    }),

  /**
   * Subscribe to driver booking requests (for drivers waiting for bookings)
   */
  onBookingRequest: protectedProcedure.subscription(({ ctx }) => {
    return observable<DriverBookingRequest>((emit) => {
      const driverId = ctx.session.user.id;
      const channel = `driver:${driverId}`;
      const subscriber = createRedisSubscriber(channel);

      subscriber.subscribe(channel, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${channel}:`, err);
          emit.error(err);
        }
      });

      subscriber.on("message", (ch, message) => {
        if (ch === channel) {
          try {
            const event = JSON.parse(message) as DriverBookingRequest;
            emit.next(event);
          } catch (e) {
            console.error("Failed to parse message:", e);
          }
        }
      });

      // Cleanup on unsubscribe
      return () => {
        subscriber.unsubscribe(channel);
        subscriber.quit();
      };
    });
  }),

  /**
   * Subscribe to user notifications (for general notifications)
   */
  onUserNotification: protectedProcedure.subscription(({ ctx }) => {
    return observable<BookingEvent>((emit) => {
      const userId = ctx.session.user.id;
      const channel = `user:${userId}`;
      const subscriber = createRedisSubscriber(channel);

      subscriber.subscribe(channel, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${channel}:`, err);
          emit.error(err);
        }
      });

      subscriber.on("message", (ch, message) => {
        if (ch === channel) {
          try {
            const event = JSON.parse(message) as BookingEvent;
            emit.next(event);
          } catch (e) {
            console.error("Failed to parse message:", e);
          }
        }
      });

      // Cleanup on unsubscribe
      return () => {
        subscriber.unsubscribe(channel);
        subscriber.quit();
      };
    });
  }),
});

