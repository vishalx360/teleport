import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDistanceAndDuration } from '@/app/booking/getDistanceAndDuration';
import { Vehicle, vehicles } from '@/lib/constants';
import { Address } from '@prisma/client';

interface BookingStoreState {
    pickupAddress: Address | null;
    deliveryAddress: Address | null;
    distance: number;
    duration: number;
    discountPercentage: number;
    calculating: boolean;
    selectedVehicle: Vehicle | null;
    setSelectedVehicle: (vehicle: Vehicle) => void;
    setPickUpAddress: (address: Address | null) => void;
    setDeliveryAddress: (address: Address | null) => void;
    updateDistanceAndDuration: () => Promise<void>;
}

const useBookingStore = create<BookingStoreState>()(
    persist(
        (set, get) => ({
            pickupAddress: null,
            deliveryAddress: null,
            distance: 0,
            duration: 0,
            discountPercentage: 10,
            calculating: false,
            selectedVehicle: vehicles[0] || null,
            setSelectedVehicle: (vehicle: Vehicle) => set({ selectedVehicle: vehicle }),
            setPickUpAddress: (address) => {
                set({ pickupAddress: address });
                get().updateDistanceAndDuration();
            },
            setDeliveryAddress: (address) => {
                set({ deliveryAddress: address });
                get().updateDistanceAndDuration();
            },
            updateDistanceAndDuration: async () => {
                const { pickupAddress, deliveryAddress } = get();

                if (pickupAddress && deliveryAddress) {
                    set({ calculating: true });
                    const { distance, duration } = await getDistanceAndDuration(pickupAddress, deliveryAddress);
                    set({ distance: Number(distance), duration });
                    set({ calculating: false });
                }
            },
        }),
        {
            name: 'booking-session-state',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);

export default useBookingStore;
