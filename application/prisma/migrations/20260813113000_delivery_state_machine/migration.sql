ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' BEFORE 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING' BEFORE 'REFUNDED';

CREATE TYPE "DispatchStatus" AS ENUM ('NOT_STARTED', 'SEARCHING', 'ASSIGNED', 'NO_DRIVER_FOUND', 'CANCELLED');
CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_STARTED', 'DRIVER_ARRIVING', 'AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE "BookingStateAxis" AS ENUM ('PAYMENT', 'DISPATCH', 'FULFILLMENT');

ALTER TABLE "Booking"
  ADD COLUMN "dispatchStatus" "DispatchStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "stateVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "stateChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "matchingAttempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "temporalWorkflowId" TEXT;

UPDATE "Booking"
SET
  "dispatchStatus" = CASE
    WHEN "status" = 'BOOKED' AND "paymentStatus" = 'PAID' THEN 'SEARCHING'::"DispatchStatus"
    WHEN "status" IN ('ACCEPTED', 'ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED') THEN 'ASSIGNED'::"DispatchStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"DispatchStatus"
    WHEN "status" = 'FAILED' AND "paymentStatus" = 'PAID' THEN 'NO_DRIVER_FOUND'::"DispatchStatus"
    ELSE 'NOT_STARTED'::"DispatchStatus"
  END,
  "fulfillmentStatus" = CASE
    WHEN "status" = 'ACCEPTED' THEN 'DRIVER_ARRIVING'::"FulfillmentStatus"
    WHEN "status" = 'ARRIVED' THEN 'AT_PICKUP'::"FulfillmentStatus"
    WHEN "status" = 'PICKED_UP' THEN 'PICKED_UP'::"FulfillmentStatus"
    WHEN "status" = 'IN_TRANSIT' THEN 'IN_TRANSIT'::"FulfillmentStatus"
    WHEN "status" = 'DELIVERED' THEN 'DELIVERED'::"FulfillmentStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"FulfillmentStatus"
    ELSE 'NOT_STARTED'::"FulfillmentStatus"
  END,
  "matchingAttempt" = CASE WHEN "paymentStatus" = 'PAID' THEN 1 ELSE 0 END;

UPDATE "Booking"
SET "temporalWorkflowId" = 'booking-match-' || "id" || '-' || "matchingAttempt"
WHERE "paymentStatus" = 'PAID';

CREATE TABLE "BookingStateEvent" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "command" TEXT NOT NULL,
  "axis" "BookingStateAxis" NOT NULL,
  "fromState" TEXT NOT NULL,
  "toState" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingStateEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingStateEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProcessedExternalEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedExternalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Booking_temporalWorkflowId_key" ON "Booking"("temporalWorkflowId");
CREATE INDEX "Booking_dispatchStatus_createdAt_idx" ON "Booking"("dispatchStatus", "createdAt");
CREATE INDEX "Booking_fulfillmentStatus_createdAt_idx" ON "Booking"("fulfillmentStatus", "createdAt");
CREATE UNIQUE INDEX "BookingStateEvent_bookingId_commandId_axis_key" ON "BookingStateEvent"("bookingId", "commandId", "axis");
CREATE UNIQUE INDEX "BookingStateEvent_bookingId_version_axis_key" ON "BookingStateEvent"("bookingId", "version", "axis");
CREATE INDEX "BookingStateEvent_bookingId_createdAt_idx" ON "BookingStateEvent"("bookingId", "createdAt");
CREATE UNIQUE INDEX "ProcessedExternalEvent_provider_externalId_key" ON "ProcessedExternalEvent"("provider", "externalId");
CREATE INDEX "ProcessedExternalEvent_provider_processedAt_idx" ON "ProcessedExternalEvent"("provider", "processedAt");
