import { Vehicle, vehicles } from "@/lib/constants";
import { getDistanceAndDuration } from "@/lib/geoUtils";
import type { Address } from "@/generated/prisma/browser";
import { create } from "zustand";

interface BookingStoreState {
  pickupAddress: Address | null;
  deliveryAddress: Address | null;
  distance: number;
  duration: number;
  discountPercentage: number;
  calculating: boolean;
  selectedVehicle: Vehicle | null;
  setselectedVehicle: (vehicle: Vehicle) => void;
  setPickUpAddress: (address: Address | null) => void;
  setDeliveryAddress: (address: Address | null) => void;
  resetBooking: () => void;
  updateDistanceAndDuration: () => Promise<void>;
}

const useBookingStore = create<BookingStoreState>()((set, get) => ({
  pickupAddress: null,
  deliveryAddress: null,
  distance: 0,
  duration: 0,
  discountPercentage: 10,
  calculating: false,
  selectedVehicle: vehicles[0] || null,
  setselectedVehicle: (vehicle: Vehicle) => set({ selectedVehicle: vehicle }),
  setPickUpAddress: (address) => {
    set({ pickupAddress: address });
    get().updateDistanceAndDuration();
  },
  setDeliveryAddress: (address) => {
    set({ deliveryAddress: address });
    get().updateDistanceAndDuration();
  },
  resetBooking: () =>
    set({
      pickupAddress: null,
      deliveryAddress: null,
      distance: 0,
      duration: 0,
      calculating: false,
      selectedVehicle: vehicles[0] || null,
    }),
  updateDistanceAndDuration: async () => {
    const { pickupAddress, deliveryAddress } = get();

    if (pickupAddress && deliveryAddress) {
      set({ calculating: true });
      const { distance, duration } = await getDistanceAndDuration(
        pickupAddress,
        deliveryAddress,
      );
      set({ distance: Number(distance), duration });
      set({ calculating: false });
    }
  },
}));

export default useBookingStore;
