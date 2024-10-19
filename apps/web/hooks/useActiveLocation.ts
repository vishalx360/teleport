import { useEffect, useState } from 'react';
import { useGeolocated } from 'react-geolocated';

// Helper function to calculate distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of Earth in meters
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters
    return distance;
}

function useActiveLocation({ updateInterval = 60, distanceThreshold = 200 }) {
    const { coords, getPosition } = useGeolocated({
        positionOptions: { enableHighAccuracy: false },
        watchPosition: true,
        userDecisionTimeout: 5000,
    });

    const [previousCoords, setPreviousCoords] = useState({ latitude: null, longitude: null });
    const [currentCoords, setCurrentCoords] = useState(null);

    useEffect(() => {
        const intervalId = setInterval(() => {
            console.log("Getting position");
            getPosition();
        }, updateInterval * 1000); // Update interval in seconds

        return () => clearInterval(intervalId);
    }, [getPosition, updateInterval]);

    useEffect(() => {
        if (coords && coords.latitude && coords.longitude) {
            if (previousCoords.latitude !== null && previousCoords.longitude !== null) {
                const distance = getDistanceFromLatLonInMeters(
                    previousCoords.latitude,
                    previousCoords.longitude,
                    coords.latitude,
                    coords.longitude
                );

                if (distance <= distanceThreshold) {
                    console.log(`Coordinates have not changed by more than ${distanceThreshold} meters. Skipping update.`);
                    return;
                }
            }

            // Update previous coordinates and set current coordinates
            setPreviousCoords({ latitude: coords.latitude, longitude: coords.longitude });
            setCurrentCoords({ latitude: coords.latitude, longitude: coords.longitude });
        }
    }, [coords, previousCoords, distanceThreshold]);

    return currentCoords;
}

export default useActiveLocation;
