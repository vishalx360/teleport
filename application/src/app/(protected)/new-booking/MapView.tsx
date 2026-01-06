import Map from "./Map";

export interface Coordinates {
    latitude: number | null;
    longitude: number | null;
}

interface LocationWithCoords {
    latitude: number;
    longitude: number;
}

const MapView = ({ pickupLocation, deliveryLocation,
    driverLocation,
    distance, duration, calculating = false
}: {
    pickupLocation: LocationWithCoords;
    deliveryLocation: LocationWithCoords;
    driverLocation?: Coordinates;
    distance: number;
    duration: number;
    calculating?: boolean;
}) => {
    // Build extra points only if driver location has valid coordinates
    const extraPoints = (driverLocation && driverLocation.latitude !== null && driverLocation.longitude !== null) 
        ? [{ latitude: driverLocation.latitude, longitude: driverLocation.longitude, markerText: "Driver", inview: false }] 
        : [];

    return (
        <div className="relative h-48 w-full rounded-lg overflow-hidden">
            <Map
                points={[
                    { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude, markerText: "Pickup", inview: true },
                    { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude, markerText: "Delivery", inview: true }
                ]}
                extraPoints={extraPoints}
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
