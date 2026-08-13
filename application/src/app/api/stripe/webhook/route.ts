import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/env";
import { getStripe, StripeConfigurationError } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  applyBookingCommand,
  InvalidBookingTransitionError,
} from "@/server/services/bookingTransitions";
import { PaymentStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Stripe webhook is not configured", {
      status: 503,
    });
  }
  let stripe;
  try {
    stripe = getStripe();
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return new NextResponse("Stripe payments are not configured", {
        status: 503,
      });
    }
    throw error;
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return new NextResponse("Missing Stripe signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new NextResponse("Invalid Stripe signature", { status: 400 });
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        await db.$transaction(async (tx) => {
          const claimed = await tx.processedExternalEvent.createMany({
            data: [
              {
                provider: "STRIPE",
                externalId: event.id,
                eventType: event.type,
              },
            ],
            skipDuplicates: true,
          });
          if (claimed.count === 0) return;

          const booking = await tx.booking.findFirstOrThrow({
            where: { stripeCheckoutSessionId: session.id },
          });
          if (
            ([
              PaymentStatus.PAID,
              PaymentStatus.REFUND_PENDING,
              PaymentStatus.REFUNDED,
            ] as PaymentStatus[]).includes(booking.paymentStatus)
          ) {
            return;
          }
          const result = await applyBookingCommand(tx, {
            bookingId: booking.id,
            commandId: `stripe:${event.id}`,
            command: "PAYMENT_SUCCEEDED",
            actorId: booking.userId,
            metadata: { stripeEventId: event.id },
          });
          if (!result.applied) return;

          await tx.booking.update({
            where: { id: booking.id },
            data: {
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id,
            },
          });
          await tx.outboxEvent.create({
            data: {
              topic: "BOOKINGS",
              eventType: "booking.matching_requested.v1",
              key: booking.id,
              payload: {
                bookingId: booking.id,
                attempt: result.booking.matchingAttempt,
                occurredAt: new Date().toISOString(),
              },
            },
          });
        });
      } catch (error) {
        if (!(error instanceof InvalidBookingTransitionError)) throw error;
        // A later Stripe success event for the same Checkout Session is a
        // harmless duplicate once payment has already advanced.
      }
    }
  }
  if (
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    await db.$transaction(async (tx) => {
      const claimed = await tx.processedExternalEvent.createMany({
        data: [
          { provider: "STRIPE", externalId: event.id, eventType: event.type },
        ],
        skipDuplicates: true,
      });
      if (claimed.count === 0) return;
      const booking = await tx.booking.findFirst({
        where: { stripeCheckoutSessionId: session.id },
      });
      if (
        !booking ||
        !([
          PaymentStatus.PENDING,
          PaymentStatus.PROCESSING,
          PaymentStatus.AUTHORIZED,
        ] as PaymentStatus[]).includes(booking.paymentStatus)
      )
        return;
      await applyBookingCommand(tx, {
        bookingId: booking.id,
        commandId: `stripe:${event.id}`,
        command: "PAYMENT_FAILED",
        actorId: booking.userId,
        reason: event.type,
        metadata: { stripeEventId: event.id },
      });
    });
  }
  return NextResponse.json({ received: true });
}
