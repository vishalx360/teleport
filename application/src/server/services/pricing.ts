import { VehicleClass } from "@/generated/prisma/enums";

const COST_PER_KM: Record<VehicleClass, number> = {
  BIKE: 50,
  PICKUP_TRUCK: 100,
  TRUCK: 200,
};

export const quoteBooking = ({
  vehicleClass,
  distanceMeters,
  durationSeconds,
}: {
  vehicleClass: VehicleClass;
  distanceMeters: number;
  durationSeconds: number;
}) => {
  const subtotalAmount = Math.round((distanceMeters / 1_000) * COST_PER_KM[vehicleClass] * 100);
  const discountAmount = Math.round(subtotalAmount * 0.1);
  const totalAmount = subtotalAmount - discountAmount;

  return { distanceMeters, durationSeconds, subtotalAmount, discountAmount, totalAmount, currency: "INR" };
};
