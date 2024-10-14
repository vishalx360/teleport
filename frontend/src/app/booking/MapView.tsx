import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { Address } from "@prisma/client";
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useState } from "react";
import Map from "./Map";
import { getDistanceAndDuration } from "./getDistanceAndDuration";


const MapView = ({ pickupLocation, deliveryLocation }: {
    pickupLocation: Address;
    deliveryLocation: Address;
}) => {
    const [eta, setEta] = useState({ distance: "0 Km", duration: 0 });


    useEffect(() => {
        getDistanceAndDuration(pickupLocation, deliveryLocation).then(setEta);
    }, [pickupLocation, deliveryLocation]
    );

    return (
        <div className="relative h-48 w-full rounded-lg overflow-hidden">
            <Map
                points={[
                    { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude, markerText: "Pickup" },
                    { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude, markerText: "Delivery" }
                ]}
            />
            <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-lg px-2 py-1 rounded text-sm font-medium">
                {eta.distance} Kms - {eta.duration} mins
            </div>
            {/* <div className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-lg  px-2 py-1 rounded text-sm font-medium flex items-center">
            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
            {pickupLocation.nickname}
        </div>
        <div className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-lg  px-2 py-1 rounded text-sm font-medium flex items-center">
            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
            {deliveryLocation.nickname}
        </div> */}
        </div>
    )
};
export default MapView;
