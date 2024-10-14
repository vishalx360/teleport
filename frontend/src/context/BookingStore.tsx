import { getDistanceAndDuration } from '@/app/booking/getDistanceAndDuration';
import { Vehicle, vehicles } from '@/lib/constants';
import { Address } from '@prisma/client';
import { create } from 'zustand';

interface BookingStoreState {
    pickupAddress: Address | null;
    deliveryAddress: Address | null;
    distance: number;
    duration: number;
    calculating: boolean;
    selectedVehicle: Vehicle | null;
    setSelectedVehicle: (vehicle: Vehicle) => void;
    setPickUpAddress: (address: Address) => void;
    setDeliveryAddress: (address: Address) => void;
    updateDistanceAndDuration: () => Promise<void>; // New method to update distance and duration
}

const useBookingStore = create<BookingStoreState>((set, get) => ({
    pickupAddress: null,
    deliveryAddress: null,
    distance: 0,
    duration: 0,
    calculating: false,
    selectedVehicle: vehicles[0] || null,
    setSelectedVehicle: (vehicle: Vehicle) => set({ selectedVehicle: vehicle }),
    setPickUpAddress: (address: Address) => {
        set({ pickupAddress: address });
        get().updateDistanceAndDuration(); // Call to update distance and duration
    },
    setDeliveryAddress: (address: Address) => {
        set({ deliveryAddress: address });
        get().updateDistanceAndDuration(); // Call to update distance and duration
    },
    updateDistanceAndDuration: async () => {
        const { pickupAddress, deliveryAddress } = get();

        if (pickupAddress && deliveryAddress) {
            set({ calculating: true }); // Set calculating to true
            const { distance, duration } = await getDistanceAndDuration(pickupAddress, deliveryAddress);
            set({ distance: Number(distance), duration }); // Update distance and duration in the store
            set({ calculating: false }); // Set calculating to false
        }
    },
}));

export default useBookingStore;
