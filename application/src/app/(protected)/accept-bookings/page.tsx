'use client'
import BackButton from "@/components/BackButton";
import { LocationType } from "@/components/MapPicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { GetAddressFromCoordinates, cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import TimeAgo from 'react-timeago';

// Helper function to calculate distance using Haversine formula
const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
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

export default function AcceptBookingsPage() {
  const [available, setAvailable] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className='gap-2'>
          <div className='flex flex-row gap-2'>
            <BackButton />
            <CardTitle className="text-2xl font-bold mt-2">
              Accept Bookings
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-gray-600">
            Once you are available for bookings, you will be able to accept bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="available" className={cn("flex items-center justify-between p-4 rounded-xl text-md transition-colors space-x-2", available ? "bg-blue-500 text-white" : "bg-gray-50")}>
              <h1>I am Available for Bookings</h1>
              <Switch
                checked={available}
                onCheckedChange={setAvailable}
                id="available"
              />
            </Label>
            {available && <AvailableSection />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AvailableSection() {
  const [currentLocation, setCurrentLocation] = useState<LocationType>({
    address: '',
    latitude: null,
    longitude: null,
  });
  const [previousCoords, setPreviousCoords] = useState({ latitude: null, longitude: null });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Function to fetch the user's current location
  const fetchLocation = () => {
    // remove this
    setCurrentLocation({
      address: "1st Cross Road, Muneswara Nagar, 560102, HSR Layout, Bengaluru, Bengaluru Urban, Karnataka, India"
    });
    setLastUpdated(new Date());
    return
    // remove this

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Check if coordinates have changed more than 200 meters
          if (previousCoords.latitude !== null && previousCoords.longitude !== null) {
            const distance = getDistanceFromLatLonInMeters(
              previousCoords.latitude,
              previousCoords.longitude,
              latitude,
              longitude
            );

            if (distance <= 200) {
              console.log("Coordinates have not changed by more than 200 meters. Skipping API call.");
              return;
            }
          }

          // Update previous coordinates
          setPreviousCoords({ latitude, longitude });

          // Fetch address from new coordinates
          const address = await GetAddressFromCoordinates({ latitude, longitude });
          setCurrentLocation({ address, latitude, longitude });

          // Update last updated time
          setLastUpdated(new Date());
        },
        (error) => {
          console.error("Error fetching location:", error);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  // Fetch location on component mount
  useEffect(() => {
    fetchLocation()
    const refreshLocationInterval = setInterval(() => {
      fetchLocation();
    }, 5 * 60 * 1000);
    return () => clearInterval(refreshLocationInterval);
  }, []);

  return (
    <div className="mt-4">
      <div className="space-y-2">
        <p className="text-gray-600">
          <strong>Current Location: </strong>
          {currentLocation.address || "Fetching current location..."}
        </p>
        {lastUpdated &&
          <p className=" text-sm text-gray-500">Updated {" "}
            <TimeAgo date={lastUpdated} live={false} />
          </p>
        }
      </div>
      <div className="mt-5">
        <Skeleton className="w-full p-2 h-10">
          Finding nearby bookings...
        </Skeleton>
      </div>
    </div>
  );
}
