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
import { GetAddressFromCoordinates, cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { MapPin, MapPinCheck, MapPinned, RadarIcon } from 'lucide-react';
import { pusherClient } from '@/lib/pusherClient';
import { Booking } from '@prisma/client';

export default function AcceptBookingsPage() {
  const { coords, isGeolocationAvailable, positionError, isGeolocationEnabled, getPosition, timestamp } =
    useGeolocated({
      positionOptions: { enableHighAccuracy: false },
      userDecisionTimeout: 5000,
    });

  const [available, setAvailable] = useState(false);
  const [address, setAddress] = useState("");
  const { mutateAsync, isPending } = api.driver.setAvailablity.useMutation();

  useEffect(() => {
    if (coords) {
      GetAddressFromCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
        .then(setAddress)
        .catch(() => console.error("Error fetching address"));
    }
  }, [coords]);

  const handleSetAvailablity = (checked) => {
    if (!isGeolocationAvailable) return toast.warning("Location services are not available.");
    if (!isGeolocationEnabled) {
      toast.warning("Please enable location services.");
      getPosition();
      return;
    }
    if (!coords) return toast.warning("Fetching your current location...");

    mutateAsync({ available: checked, location: coords })
      .then(({ available, message }) => {
        setAvailable(available);
        toast.success(message);
      })
      .catch(() => {
        setAvailable(false);
        toast.error("Failed to update availability.")
      });
  };

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
          <div className="text-gray-600 space-y-2">
            <p><strong> <MapPin className='inline' /> Current Location:</strong> {positionError ? `Error: ${positionError.message}` : (address || "Fetching location...")}</p>
            {timestamp && <p className="text-sm text-gray-500">Updated <TimeAgo date={timestamp} /></p>}
          </div>
          <Label htmlFor="available" className={cn("flex items-center justify-between p-4 rounded-xl text-md transition-colors space-x-2", available ? "bg-blue-500 text-white" : "bg-gray-50")}>
            <span>I am Available for Bookings</span>
            <Switch disabled={isPending} checked={available} onCheckedChange={handleSetAvailablity} id="available" />
          </Label>
          {available && <FindingBookings />}
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