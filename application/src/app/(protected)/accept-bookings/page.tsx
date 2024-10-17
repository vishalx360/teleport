'use client'
import BackButton from "@/components/BackButton";
import { LocationType } from "@/components/MapPicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { GetAddressFromCoordinates, cn, getDistanceFromLatLonInMeters } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import TimeAgo from 'react-timeago';
import { toast } from "sonner";

// Helper function to calculate distance using Haversine formula

export default function AcceptBookingsPage() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationType>({
    address: '',
    latitude: null,
    longitude: null,
  });

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
            <Label htmlFor="available" className={cn("flex items-center justify-between p-4 rounded-xl text-md transition-colors space-x-2", locationEnabled ? "bg-blue-500 text-white" : "bg-gray-50")}>
              <h1>Location</h1>
              <Switch
                checked={locationEnabled}
                onCheckedChange={setLocationEnabled}
                id="location"
              />
            </Label>
            <LocationSection
              locationEnabled={locationEnabled}
              currentLocation={currentLocation} setCurrentLocation={setCurrentLocation} />

          </div>
          <div>
            {locationEnabled && <AvailableSection currentLocation={currentLocation} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function AvailableSection({ currentLocation }) {

  const [available, setAvailable] = useState(false);
  const { mutateAsync, isPending } = api.driver.setAvailablity.useMutation();

  function handleSetAvailablity(checked: boolean) {

    if (currentLocation.latitude === null || currentLocation.longitude === null) {
      toast.warning("Please wait while we fetch your current location.")
    } else {
      mutateAsync({
        available: checked,
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }
      }).then((response) => {
        setAvailable(response.available);
        toast.success(response.message);
      }).catch((error) => {
        toast.error("Failed to update availability. Please try again later.")
      })
    }
  }

  return (
    <div className="mt-4">
      <Label htmlFor="available" className={cn("flex items-center justify-between p-4 rounded-xl text-md transition-colors space-x-2", available ? "bg-blue-500 text-white" : "bg-gray-50")}>
        <h1>I am Available for Bookings</h1>
        <Switch
          disabled={isPending}
          checked={available}
          onCheckedChange={handleSetAvailablity}
          id="available"
        />
      </Label>
      <div className="mt-5">
        <Skeleton className="w-full p-2 h-10">
          Finding nearby bookings...
        </Skeleton>
      </div>
    </div>
  );
}

function LocationSection({
  locationEnabled,
  setCurrentLocation,
  currentLocation,
}: {
  locationEnabled: boolean,
  setCurrentLocation: any,
  currentLocation: any
}) {

  const [previousCoords, setPreviousCoords] = useState({ latitude: null, longitude: null });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Function to fetch the user's current location
  const fetchLocation = () => {
    // remove this
    setCurrentLocation({
      address: "BTM Layout, Bengaluru, Bengaluru Urban, Karnataka, India",
      latitude: 12.912389,
      longitude: 77.593148
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
    let refreshLocationInterval
    if (locationEnabled) {
      fetchLocation()
      refreshLocationInterval = setInterval(() => {
        fetchLocation();
      }, 5 * 60 * 1000);
    }
    return () => {
      if (refreshLocationInterval) {
        clearInterval(refreshLocationInterval)
      }
    };
  }, [locationEnabled]);
  if (!locationEnabled) {
    return null;
  }
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
    </div>
  );
}
