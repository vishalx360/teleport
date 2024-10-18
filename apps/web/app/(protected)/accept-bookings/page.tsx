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
import { LucideInfo, MapPin, MapPinCheck, MapPinned, RadarIcon, RefreshCcw } from 'lucide-react';
import { pusherClient } from '@/lib/pusherClient';
import { Booking } from '@repo/database';
import { useSession } from 'next-auth/react';
import { vehicleClassMap, vehicles } from '@/lib/constants';
import MapView from '../new-booking/MapView';

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
      await updateDriverLocation(coords);
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

type BookingRequest = {
  booking: Booking;
  acceptBefore: Date;
  channel: string;
};

function FindingBookings() {
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);

  useEffect(() => {
    pusherClient.user.bind('driver-booking-request', (data: BookingRequest) => {
      console.log({ data })
      setBookingRequest({
        ...data,
        acceptBefore: new Date(data.acceptBefore),
      });

    });

    return () => {
      pusherClient.user.unbind('driver-booking-request');
    };
  }, []);

  if (bookingRequest) {
    return <BookingRequestUI
      request={bookingRequest}
      setRequest={setBookingRequest}
    />;
  }

  return (
    <div className='space-y-4 mt-5'>
      <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
        <MapPinned className="w-16 h-16 mx-auto animate-pulse text-gray-300" />
        <p>Finding nearby bookings...</p>
      </div>
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  );
}

function BookingRequestUI({ request, setRequest }: { request: BookingRequest, setRequest: (request: BookingRequest | null) => void }) {
  const { booking, acceptBefore, channel } = request;
  const [timeLeft, setTimeLeft] = useState<number>(() => calculateTimeLeft(acceptBefore));
  const [progress, setProgress] = useState<number>(100);
  const { mutateAsync: sendBookingResponse, isPending: sendingBookingResponse } = api.driver.bookingResponse.useMutation();

  useEffect(() => {
    if (timeLeft <= 0) {
      setRequest(null); // Clear request when time runs out
      return;
    }

    const intervalId = setInterval(() => {
      const remainingTime = calculateTimeLeft(acceptBefore);
      setTimeLeft(remainingTime);

      // Calculate progress percentage
      const totalTime = acceptBefore.getTime() - new Date().getTime();
      const percentage = (remainingTime / totalTime) * 100;
      setProgress(Math.max(percentage, 0));

      // Auto-clear the request when time expires
      if (remainingTime <= 0) {
        clearInterval(intervalId);
        setRequest(null); // Clear the request after timeout
      }
    }, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [acceptBefore, timeLeft]);

  const handleResponse = (accepted: boolean) => {
    sendBookingResponse({
      bookingId: booking.id,
      accepted,
      channel,
    }).finally(() => {
      setRequest(null);
    })
  };


  return (
    <div className='space-y-4 mt-5'>
      <div className="flex flex-row items-center justify-center gap-4">
        <LucideInfo className="inline" />
        <p>New booking request received</p>
      </div>
      {/* Map view */}
      <MapView
        pickupLocation={booking.pickupAddress}
        deliveryLocation={booking.deliveryAddress}
        distance={booking?.distance}
        duration={booking?.duration}
      />

      {/* Booking information */}
      <div className="space-y-4">
        <p className="text-lg font-bold">
          {booking.pickupAddress?.nickname} <MapPin className="inline" /> {booking.deliveryAddress?.nickname}
        </p>
        <h1 className="font-bold text-lg">
          ₹{booking.price}
        </h1>
        <p>Distance: {booking.distance} km</p>
        <p>Duration: {booking.duration} mins</p>
      </div>

      {/* Progress bar */}
      <ProgressBar progress={progress} />

      {/* Time left */}
      <p className="text-sm text-red-500">Time left to accept: {Math.ceil(timeLeft / 1000)} seconds</p>

      {/* Accept/Reject buttons */}
      <div className="flex gap-4">
        <button className="btn btn-primary" onClick={() => { handleResponse(true) }}>Accept Booking</button>
        <button className="btn btn-secondary" onClick={() => { handleResponse(true) }}>Reject</button>
      </div>
    </div>
  );
}

// Helper function to calculate time left in milliseconds
function calculateTimeLeft(acceptBefore: Date): number {
  const now = new Date().getTime();
  return acceptBefore.getTime() - now;
}

// Simple progress bar component
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 rounded h-2.5">
      <div
        className="bg-blue-600 h-2.5 rounded"
        style={{ width: `${progress}%` }}
      />
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