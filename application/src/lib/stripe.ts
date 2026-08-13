import Stripe from "stripe";

import { env } from "@/env";

let stripeClient: Stripe | undefined;

export class StripeConfigurationError extends Error {
  constructor() {
    super("Stripe payments are not configured. Add STRIPE_SECRET_KEY to application/.env and restart the app.");
    this.name = "StripeConfigurationError";
  }
}

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new StripeConfigurationError();
  stripeClient ??= new Stripe(env.STRIPE_SECRET_KEY);
  return stripeClient;
}
