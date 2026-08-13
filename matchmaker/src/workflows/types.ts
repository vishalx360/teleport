export type BookingMatchingRequestedEvent = {
  bookingId: string;
  attempt: number;
  occurredAt: string;
};

export type BookingCreatedEvent = BookingMatchingRequestedEvent;

export type BookingForMatch = {
  id: string;
  status: "BOOKED";
  matchingAttempt: number;
  vehicleClass: string;
  pickupAddress: {
    latitude: number;
    longitude: number;
    nickname: string;
    address: string;
  };
  deliveryAddress: {
    latitude: number;
    longitude: number;
    nickname: string;
    address: string;
  };
  distanceMeters: number;
  durationSeconds: number;
  totalAmount: number;
  currency: string;
};

export type DriverResponse = {
  driverId: string;
  accepted: boolean;
  responseToken: string;
};

export type DriverOffer = {
  driverId: string;
  responseToken: string;
};
