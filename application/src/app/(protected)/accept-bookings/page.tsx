'use client';

import { useEffect, useState } from 'react';
import TimeAgo from 'react-timeago';
import { toast } from 'sonner';
import BackButton from "@/components/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { GetAddressFromCoordinates, getDistanceFromLatLonInMeters } from "@/lib/geoUtils";
import { api } from "@/trpc/react";
import { LucideInfo, MapPin, MapPinned } from 'lucide-react';
import { Booking } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { vehicleClassMap } from '@/lib/constants';
import MapView from '../new-booking/MapView';
import useActiveLocation from '@/hooks/useActiveLocation';
import { useRouter } from 'next/navigation';

export default function AcceptBookingsPage() {
  const { data: session, status } = useSession();
  const [address, setAddress] = useState("");
  const [lastSentLocation, setLastSentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { currentCoords, positionError } = useActiveLocation({ updateInterval: 60, distanceThreshold: 200 });

  const { data: driverAvailability, isLoading: gettingAvailability, refetch: refreshDriverAvailability } = api.driver.getAvailablity.useQuery();
  const { mutateAsync: setAvailablity, isPending: settingAvailablity } = api.driver.setAvailablity.useMutation();
  const { mutateAsync: updateLocation, isPending: updatingLocation } = api.driver.updateLocation.useMutation();

  useEffect(() => {
    if (!currentCoords) return;
    
    // If we haven't sent a location yet, send it immediately
    if (!lastSentLocation) {
      updateLocation({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude
      }).then(() => {
        setLastSentLocation({
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude
        });
        GetAddressFromCoordinates({ latitude: currentCoords.latitude, longitude: currentCoords.longitude }).then((address) => {
          setAddress(address);
        });
        toast.success("Location updated successfully.");
      }).catch(() => {
        toast.error("Failed to update location.");
      });
      return;
    }

    // Calculate distance between last sent location and current location
    const distanceInMeters = getDistanceFromLatLonInMeters(
      lastSentLocation.latitude,
      lastSentLocation.longitude,
      currentCoords.latitude,
      currentCoords.longitude
    );

    // Only send update if distance is more than 400 meters
    if (distanceInMeters > 400) {
      updateLocation({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude
      }).then(() => {
        setLastSentLocation({
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude
        });
        GetAddressFromCoordinates({ latitude: currentCoords.latitude, longitude: currentCoords.longitude }).then((address) => {
          setAddress(address);
        });
        toast.success("Location updated successfully.");
      }).catch(() => {
        toast.error("Failed to update location.");
      });
    }
  }, [currentCoords, lastSentLocation]);

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
                </div>
                <p className="text-sm text-gray-600"> {positionError ? `Error: ${positionError.message}` : (address || "Fetching location...")}</p>
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
  booking: {
    id: string;
    userId: string;
    vehicleClass: string;
    pickupAddress: {
      id: string;
      nickname: string;
      address: string;
      contactName: string;
      mobile: string;
      latitude: number;
      longitude: number;
    };
    deliveryAddress: {
      id: string;
      nickname: string;
      address: string;
      contactName: string;
      mobile: string;
      latitude: number;
      longitude: number;
    };
    price: number;
    distance: number;
    duration: number;
  };
  acceptBefore: string;
};

function FindingBookings() {
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);

  // Subscribe to booking requests via SSE
  api.subscriptions.onBookingRequest.useSubscription(undefined, {
    onData: (data) => {
      console.log('Received booking request:', data);
      if (data.event === 'BOOKING_REQUEST') {
        setBookingRequest({
          booking: data.data.booking,
          acceptBefore: data.data.acceptBefore,
        });
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    },
  });

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
  const { booking, acceptBefore } = request;
  const acceptBeforeDate = new Date(acceptBefore);
  const [timeLeft, setTimeLeft] = useState<number>(() => calculateTimeLeft(acceptBeforeDate));
  const [progress, setProgress] = useState<number>(100);
  const { mutateAsync: sendBookingResponse, isPending: sendingBookingResponse } = api.driver.bookingResponse.useMutation();
  const router = useRouter();

  useEffect(() => {
    if (timeLeft <= 0) {
      setRequest(null);
      return;
    }

    const intervalId = setInterval(() => {
      const remainingTime = calculateTimeLeft(acceptBeforeDate);
      setTimeLeft(remainingTime);

      const totalTime = acceptBeforeDate.getTime() - new Date().getTime();
      const percentage = (remainingTime / totalTime) * 100;
      setProgress(Math.max(percentage, 0));

      if (remainingTime <= 0) {
        clearInterval(intervalId);
        setRequest(null);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [acceptBefore, timeLeft]);

  const handleResponse = (accepted: boolean) => {
    sendBookingResponse({
      bookingId: booking.id,
      accepted,
    }).then(() => {
      if (accepted) {
        router.push(`/booking/${booking.id}`);
      } else {
        setRequest(null);
      }
    }).catch((error) => {
      console.error('Failed to send response:', error);
      toast.error('Failed to send response');
    });
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
        <button 
          className="btn btn-primary" 
          onClick={() => handleResponse(true)}
          disabled={sendingBookingResponse}
        >
          Accept Booking
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => handleResponse(false)}
          disabled={sendingBookingResponse}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function calculateTimeLeft(acceptBefore: Date): number {
  const now = new Date().getTime();
  return acceptBefore.getTime() - now;
}

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
