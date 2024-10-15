import { env } from '@/env';
import axios from 'axios';

export const getDistanceAndDuration = async (start, end) => {
    const mapboxAccessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN; // Your Mapbox access token
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?access_token=${mapboxAccessToken}`;

    try {
        const response = await axios.get(url);
        const data = response.data.routes[0]; // Distance in meters

        const distanceInKm = (data.distance / 1000).toFixed(2); // Convert to kilometers
        const durationInMinutes = Math.floor(data.duration / 60); // Convert to minutes

        return {
            distance: distanceInKm,
            duration: durationInMinutes,
        };
    } catch (error) {
        console.error("Error fetching distance:", error);
        throw error;
    }
};
