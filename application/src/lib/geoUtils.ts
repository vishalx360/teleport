interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DistanceAndDuration {
  distance: string;
  duration: number;
}

// Use OSRM for driving directions (free, no API key required)
export const getDistanceAndDuration = async (
  start: Coordinates,
  end: Coordinates,
): Promise<DistanceAndDuration | null> => {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=false`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Teleport-App/1.0'
      }
    });
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.log("No routes data found");
      return null;
    }
    
    const route = data.routes[0];
    const distanceInKm = (route.distance / 1000).toFixed(2); // Convert meters to kilometers
    const durationInMinutes = Math.floor(route.duration / 60); // Convert seconds to minutes

    return {
      distance: distanceInKm,
      duration: durationInMinutes,
    };
  } catch (error) {
    console.error("Error fetching distance:", error);
    throw error;
  }
};

export const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

// Use Nominatim for reverse geocoding (free, no API key required)
export const GetAddressFromCoordinates = async ({
  longitude,
  latitude,
}: {
  longitude: number;
  latitude: number;
}): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'Teleport-App/1.0' // Nominatim requires a User-Agent
        }
      }
    );
    const data = await response.json();
    const address = data.display_name || "Unknown location";
    return address;
  } catch (error) {
    console.error("Error fetching address:", error);
    return "Unknown location";
  }
};
