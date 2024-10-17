import useBookingStore from '@/context/BookingStore';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { Address } from "@prisma/client";
import 'mapbox-gl/dist/mapbox-gl.css';
import Map from "./Map";


const MapView = ({ pickupLocation, deliveryLocation,
    distance, duration, calculating
}: {
    pickupLocation: Address;
    deliveryLocation: Address;
    distance: number;
    duration: number;
    calculating: boolean;
}) => {

    return (
        <div className="relative h-48 w-full rounded-lg overflow-hidden">
            <Map
                points={[
                    { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude, markerText: "Pickup" },
                    { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude, markerText: "Delivery" }
                ]}
            />
            <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-lg px-2 py-1 rounded text-sm font-medium">
                {
                    calculating ? "Calculating..." : `${distance} km, ${duration} mins`
                }
            </div>
        </div>
    )
};
export default MapView;
