'use client';

import { useEffect, useState } from 'react';
import { useGeolocated } from 'react-geolocated';
import TimeAgo from 'react-timeago';
import { toast } from 'sonner';
import BackButton from "@/components/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { GetAddressFromCoordinates } from "@/lib/geoUtils";
import { api } from "@/trpc/react";
import { MapPin, MapPinCheck, MapPinned, RadarIcon, RefreshCcw } from 'lucide-react';
import { pusherClient } from '@/lib/pusherClient';
import { Booking } from '@repo/database';
import { useSession } from 'next-auth/react';
import { vehicleClassMap, vehicles } from '@/lib/constants';

export default function AcceptBookingsPage() {
  const { data: session, status } = useSession();
  const [address, setAddress] = useState("");

  const { coords, isGeolocationAvailable, positionError, timestamp, isGeolocationEnabled, getPosition } = useGeolocated({
    positionOptions: { enableHighAccuracy: false },
    userDecisionTimeout: 5000,
  });
  const { data: driverAvailability, isLoading: gettingAvailability, refetch: refreshDriverAvailability } = api.driver.getAvailablity.useQuery();
  const { mutateAsync: setAvailablity, isPending: settingAvailablity } = api.driver.setAvailablity.useMutation();
  const { mutateAsync: updateLocation, isPending: updatingLocation } = api.driver.updateLocation.useMutation();

  useEffect(() => {
    handleGeolocation()
  }, [coords]);

  const handleGeolocation = async () => {
    if (!isGeolocationAvailable) return toast.warning("Location services are not available.");
    if (!isGeolocationEnabled) {
      toast.warning("Please enable location services.");
      getPosition();
      return;
    }
    if (!coords) return toast.info("Fetching your current location...");
    try {
      await updateDriverLocation(coords);
      const fetchedAddress = await GetAddressFromCoordinates(coords);
      setAddress(fetchedAddress);
    } catch (error) {
      toast.error("Failed to update location or fetch address.");
      console.error(error);
    }
  };

  const updateDriverLocation = async ({ latitude, longitude }) => {
    try {
      await updateLocation({ latitude, longitude });
      toast.success("Location updated successfully.");
    } catch {
      throw new Error("Failed to update location.");
    }
  };

  const handleSetAvailablity = async (checked: boolean) => {
    try {
      const { available, message } = await setAvailablity({ available: checked });
      await refreshDriverAvailability();
      toast.success(message);
    } catch {
      toast.error("Failed to update availability.");
    }
  };
  const vehicle = vehicleClassMap[session?.user.vehicleClass];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className='gap-2'>
          <div className='flex gap-2'>
            <BackButton />
            <CardTitle className="text-2xl font-bold mt-2">Accept Bookings</CardTitle>
          </div>
          <CardDescription className="text-sm text-gray-600">
            Enable availability to start accepting bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehicle && <div>
            <div
              className={`flex items-center justify-between p-3 border rounded-lg ${false ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
            >
              <div className="flex items-center gap-5">
                <img src={vehicle.icon} alt={vehicle.name} className="h-10 w-10" />
                <div>
                  <h4 className="font-medium">{vehicle.name}</h4>
                  <p className="text-sm text-gray-600">{vehicle.description}</p>
                  <p className="text-xs text-gray-600">Dimentions: {vehicle.dimensions}</p>
                  <p className="text-xs text-gray-600">Max Weight: {vehicle.maxWeight}</p>
                </div>
              </div>
            </div>
          </div>}

          <div
            className={`flex items-center justify-between p-3 border rounded-lg ${false ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
          >
            <div className="flex items-center justify-center gap-5">
              <div className="h-10 w-10" >
                <MapPin className="h-6 w-10" />
              </div>
              <div className='w-full'>
                <div className="flex w-full items-center justify-between">
                  <h4 className="font-medium">Current Location: </h4>
                  <button className="block btn btn-secondary" onClick={() => getPosition()} disabled={updatingLocation}>
                    <RefreshCcw className={cn("w-5 h-5", updatingLocation && "animate-spin")} />
                  </button>
                </div>
                <p className="text-sm text-gray-600"> {positionError ? `Error: ${positionError.message}` : (address || "Fetching location...")}</p>
                {timestamp && <p className="text-xs text-gray-500">Updated <TimeAgo date={timestamp} /></p>}
              </div>
            </div>
          </div>
          <Label htmlFor="available" className={cn("flex items-center justify-between p-4 rounded-xl text-md transition-colors space-x-2", driverAvailability?.available ? "bg-blue-500 text-white" : "bg-gray-50")}>
            {gettingAvailability ? <span>Fetching Availability</span> : <span>I am Available for Bookings</span>}
            <Switch disabled={settingAvailablity || gettingAvailability} checked={driverAvailability?.available} onCheckedChange={handleSetAvailablity} id="available" />
          </Label>
          {driverAvailability?.available && <FindingBookings />}
        </CardContent>
      </Card>
    </div>
  );
}

function FindingBookings() {
  const [bookingRequest, setBookingRequest] = useState<Booking>();

  useEffect(() => {
    pusherClient.user.bind(`driver-booking-request`, async (data: Booking) => {
      setBookingRequest(data);
    });
    return () => {
      pusherClient.user.unbind(`driver-booking-request`);
    };
  }, []);

  if (bookingRequest) {
    return <BookingRequest booking={bookingRequest} />;
  }
  return (
    <div className='space-y-4 mt-5'>
      <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
        <MapPinned className="w-16 h-16 mx-auto animate-pulse text-gray-300" />
        <p>
          Finding nearby bookings...
        </p>
      </div>
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  );
}

function BookingRequest({ booking }: { booking: Booking }) {
  return (
    <div className='space-y-4 mt-5'>
      <div className="flex flex-col items-center justify-center gap-4">
        <MapPinCheck className="w-16 h-16 mx-auto text-green-500" />
        <p>
          New booking request received
        </p>
      </div>
      <div className="space-y-4">
        <p className="text-lg font-bold">{booking.pickupAddress?.nickname} <MapPin className="inline" /> {booking.deliveryAddress?.nickname}</p>
        <p>Distance: {booking.distance} km</p>
        <p>Duration: {booking.duration} mins</p>
      </div>
      <div className="flex gap-4">
        <button className="btn btn-primary">Accept Booking</button>
        <button className="btn btn-secondary">Reject</button>
      </div>
    </div>
  );
}

// const { latitude, longitude } = position.coords;

//           // Check if coordinates have changed more than 200 meters
//           if (previousCoords.latitude !== null && previousCoords.longitude !== null) {
//             const distance = getDistanceFromLatLonInMeters(
//               previousCoords.latitude,
//               previousCoords.longitude,
//               latitude,
//               longitude
//             );

//             if (distance <= 200) {
//               console.log("Coordinates have not changed by more than 200 meters. Skipping API call.");
//               return;
//             }
//             address = GetAddressFromCoordinates({ latitude, longitude })
//           }

//  // remove this
//  setCurrentLocation({
//   address: "BTM Layout, Bengaluru, Bengaluru Urban, Karnataka, India",
//   latitude: 12.912389,
//   longitude: 77.593148
// });
// setLastUpdated(new Date());
// return
// // remove this