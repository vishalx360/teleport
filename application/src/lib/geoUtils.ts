import { env } from "@/env";
import axios from "axios";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DistanceAndDuration {
  distance: string;
  duration: number;
}

export const getDistanceAndDuration = async (
  start: Coordinates,
  end: Coordinates,
): Promise<DistanceAndDuration> => {
  const mapboxAccessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN; // Your Mapbox access token
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?access_token=${mapboxAccessToken}`;

  try {
    const response = await axios.get(url);
    const data = response.data.routes[0]; // Distance in meters

    if (!data) {
      console.log("No routes data found");
      return null
    }
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

export const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const GetAddressFromCoordinates = async ({
  longitude,
  latitude,
}: {
  longitude: number;
  latitude: number;
}) => {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
  );
  const data = await response.json();
  const address = data.features[0]?.place_name || "Unknown location";
  return address;
};
