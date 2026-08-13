import DeliveryMap from "@/components/maps/DeliveryMap";

export interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

type MapAddress = { latitude: number; longitude: number };

const MapView = ({
  pickupLocation,
  deliveryLocation,
  driverLocation,
  distance,
  duration,
  calculating,
}: {
  pickupLocation: MapAddress;
  deliveryLocation: MapAddress;
  driverLocation?: Coordinates;
  distance: number;
  duration: number;
  calculating?: boolean;
}) => {
  return (
    <div className="map-frame relative h-56 w-full">
      <DeliveryMap
        pickup={pickupLocation}
        dropoff={deliveryLocation}
        driver={
          driverLocation?.latitude != null && driverLocation.longitude != null
            ? {
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              }
            : null
        }
        includeDriverInBounds={false}
      />
      <div className="absolute left-3 top-3 rounded-xl border border-white/10 bg-[#15161a]/90 px-3 py-1.5 text-sm font-medium text-slate-100 shadow-lg backdrop-blur-lg">
        {calculating ? "Calculating..." : `${distance} km, ${duration} mins`}
      </div>
    </div>
  );
};
export default MapView;
