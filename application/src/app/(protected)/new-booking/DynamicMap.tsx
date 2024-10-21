import React from 'react';
import Map from './Map';

type Coordinates = {
    latitude: number;
    longitude: number;
};

interface MapProps {
    deliveryLocation: Coordinates;
    pickupLocation: Coordinates;
    driverLocation?: Coordinates | null; // driverLocation can be null
    isCurrentUserDriver: boolean;
}

const DynamicMap: React.FC<MapProps> = ({ deliveryLocation, pickupLocation, driverLocation, isCurrentUserDriver }) => {
    const userIcon = isCurrentUserDriver ? "/location.svg" : "/driver.svg"; // Change icon based on user type

    // Construct points array, conditionally adding the driverLocation if it's not null
    const points = [
        {
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
            icon: "/up.svg", // Icon for pickup location
            inview: true,
        },
        driverLocation && {
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            icon: userIcon, // Icon for the current user's location (driver or regular user)
            inview: true,
        },
        {
            icon: "/down.svg", // Icon for delivery location
            latitude: deliveryLocation.latitude,
            longitude: deliveryLocation.longitude,
        }
    ].filter(Boolean); // Filter out null values

    // Construct lines array, conditionally adding the driverLocation if it's not null
    const lines = driverLocation
        ? [
            [
                {
                    latitude: pickupLocation.latitude,
                    longitude: pickupLocation.longitude,
                    icon: "/up.svg", // Icon for pickup location
                    inview: true,
                },
                {
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                    icon: userIcon, // Icon for the driver or user location
                    inview: true,
                }
            ]
        ]
        : []; // If driverLocation is null, don't add the line

    return <Map points={points} lines={lines} />;
};

export default DynamicMap;
