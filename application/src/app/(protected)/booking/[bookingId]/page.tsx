'use client'

import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { api } from '@/trpc/react'
import { Booking, BookingStatus } from "@prisma/client"
import { ArrowRight, LucideCheck, LucideCircleX, MessageSquare, RefreshCw } from "lucide-react"
import { useEffect, useState } from 'react'
import TimeAgo from 'react-timeago'
import { toast } from "sonner"
import MapView, { Coordinates } from "../../new-booking/MapView"
import { formattedStatus, vehicleClassMap } from "@/lib/constants"
import Map from "../../new-booking/Map"
import { useSession } from "next-auth/react"
import useActiveLocation from "@/hooks/useActiveLocation"
import { getDistanceFromLatLonInMeters } from "@/lib/geoUtils"


function BookingDetailsPage({ params }: {
    params: {
        bookingId: string
    }
}) {
    const { bookingId } = params;
    const { data: session } = useSession();
    const { data, isLoading, error, isRefetching, dataUpdatedAt, refetch } = api.user.getBooking.useQuery(bookingId);
    const [lastUpdated, setLastUpdated] = useState(dataUpdatedAt)
    const [latestDriverLocation, setLatestDriverLocation] = useState<Coordinates | null>(null)
    const [latestEta, setLatestEta] = useState<{ distance: number; duration: number } | null>(null)
    const [lastSentLocation, setLastSentLocation] = useState<{ latitude: number; longitude: number } | null>(null)

    const cancelBookingMutation = api.user.cancelBooking.useMutation({
        onSuccess: () => {
            toast.success("Booking cancelled successfully");
            refetch();
        },
        onError: (error) => {
            console.error("Cancel booking error:", error);
            toast.error(error.message || "Failed to cancel booking");
        },
    });

    const { mutateAsync: updateLocation } = api.driver.updateLocation.useMutation();
    const { mutateAsync: updateBookingStatus } = api.driver.updateBookingStatus.useMutation();

    const handleCancelBooking = () => {
        if (!bookingId) {
            toast.error("Booking ID not found");
            return;
        }
        console.log("Cancelling booking:", bookingId);
        cancelBookingMutation.mutate(bookingId);
    };

    const handleStatusUpdate = async (status: "ARRIVED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED") => {
        if (!booking?.id) return;
        try {
            await updateBookingStatus({ bookingId: booking.id, status });
            await refetch();
            toast.success(`Status updated to ${status}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const { booking, lastUpdatedDriverLocation, lastEta } = data ?? {}
    const eta = latestEta ?? lastEta

    // Driver location tracking (only for drivers)
    const { currentCoords: latestDriverCoords } = useActiveLocation({
        updateInterval: 10,
        distanceThreshold: eta?.distance ? Number(eta?.distance) < 0.5 ? 50 : 300 : 300
    });

    // Check if current user is the driver
    const isDriver = booking?.driverId === session?.user?.id;
    // For drivers, use their current location; for users, use the driver's last updated location
    const driverLocation = isDriver && latestDriverCoords 
        ? { latitude: latestDriverCoords.latitude, longitude: latestDriverCoords.longitude }
        : (latestDriverLocation ?? lastUpdatedDriverLocation)

    // Check if booking can be cancelled (only for users, not drivers)
    const canCancelBooking = !isDriver && booking?.status && [
        BookingStatus.BOOKED,
        BookingStatus.ACCEPTED,
        BookingStatus.ARRIVED
    ].includes(booking.status);

    useEffect(() => {
        setLastUpdated(dataUpdatedAt)
    }, [dataUpdatedAt])

    // Reset last sent location when booking changes
    useEffect(() => {
        if (booking?.id) {
            setLastSentLocation(null);
        }
    }, [booking?.id])

    // Driver location updates (only for drivers)
    useEffect(() => {
        if (!isDriver || !latestDriverCoords?.latitude || !latestDriverCoords?.longitude || !booking?.id) return;
        
        // If we haven't sent a location yet, send it immediately
        if (!lastSentLocation) {
            updateLocation({
                latitude: latestDriverCoords.latitude,
                longitude: latestDriverCoords.longitude,
                bookingId: booking.id
            }).then(() => {
                setLastSentLocation({
                    latitude: latestDriverCoords.latitude,
                    longitude: latestDriverCoords.longitude
                });
            }).catch((error) => {
                console.error('Failed to update location:', error);
            });
            return;
        }

        // Calculate distance between last sent location and current location
        const distanceInMeters = getDistanceFromLatLonInMeters(
            lastSentLocation.latitude,
            lastSentLocation.longitude,
            latestDriverCoords.latitude,
            latestDriverCoords.longitude
        );

        // Only send update if distance is more than 400 meters
        if (distanceInMeters > 400) {
            updateLocation({
                latitude: latestDriverCoords.latitude,
                longitude: latestDriverCoords.longitude,
                bookingId: booking.id
            }).then(() => {
                setLastSentLocation({
                    latitude: latestDriverCoords.latitude,
                    longitude: latestDriverCoords.longitude
                });
            }).catch((error) => {
                console.error('Failed to update location:', error);
            });
        }
    }, [latestDriverCoords, booking, lastSentLocation, isDriver])

    // Subscribe to booking updates via SSE
    api.subscriptions.onBookingUpdate.useSubscription(
        { bookingId },
        {
            enabled: !!bookingId,
            onData: (event) => {
                console.log('Booking update received:', event);
                switch (event.event) {
                    case 'DRIVER_LOCATION':
                        setLatestDriverLocation(event.data as Coordinates);
                        break;
                    case 'ETA_UPDATE':
                        setLatestEta(event.data as { distance: number; duration: number });
                        break;
                    case 'STATUS_UPDATE':
                    case 'ACCEPTED':
                    case 'NO_DRIVERS':
                    case 'NO_DRIVER_ACCEPTED':
                    case 'CANCELLED':
                        // Refetch to get updated booking status
                        void refetch();
                        if (event.data && typeof event.data === 'object' && 'message' in event.data) {
                            toast.success(event.data.message as string);
                        }
                        break;
                    default:
                        void refetch();
                }
            },
            onError: (error) => {
                console.error('Subscription error:', error);
            },
        }
    );

    if (error) return <p>Error loading booking</p>;
    if (!booking && !isLoading) return <p>Booking not found</p>

    const refreshBookingData = async () => {
        await refetch()
        setLastUpdated(0)
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='flex-row gap-2 '>
                    <div className="flex items-center justify-between ">
                        <BackButton />
                        <CardTitle className="text-2xl font-bold">Booking Details</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-5">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-52 w-full" />
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (
                        <>
                            <div>
                                <div className="flex flex-row items-center gap-4">
                                    <p className="font-bold text-md">
                                        {booking?.pickupAddress?.nickname} <ArrowRight className="inline" /> {booking?.deliveryAddress.nickname}
                                    </p>
                                    <h4 className="text-sm bg-gray-200 rounded-xl px-2 py-1 w-fit uppercase">{formattedStatus[booking?.status]}</h4>
                                </div>
                                <h4 className="">
                                    Booked <TimeAgo date={new Date(booking?.createdAt)} />
                                </h4>
                            </div>

                            {driverLocation && booking.status !== BookingStatus.DELIVERED ? (
                                <div className="relative h-80 w-full rounded-lg overflow-hidden">
                                    <Map
                                        points={[
                                            {
                                                latitude: booking.pickupAddress.latitude,
                                                longitude: booking.pickupAddress.longitude,
                                                icon: "/up.svg",
                                                inview: true
                                            },
                                            {
                                                latitude: Number(driverLocation.latitude),
                                                longitude: Number(driverLocation.longitude),
                                                icon: "/driver.svg",
                                                inview: true
                                            },
                                            {
                                                icon: "/down.svg",
                                                latitude: booking.deliveryAddress.latitude,
                                                longitude: booking.deliveryAddress.longitude,
                                            }
                                        ]}
                                        lines={[
                                            [{
                                                latitude: booking.pickupAddress.latitude,
                                                longitude: booking.pickupAddress.longitude,
                                                icon: "/up.svg",
                                            },
                                            {
                                                latitude: Number(driverLocation.latitude),
                                                longitude: Number(driverLocation.longitude),
                                                icon: "/location.svg",
                                            },]
                                        ]}
                                    />
                                </div>
                            ) : (
                                <div className="relative h-48 w-full rounded-lg overflow-hidden">
                                    <Map
                                        points={[
                                            {
                                                latitude: booking.pickupAddress.latitude,
                                                longitude: booking.pickupAddress.longitude,
                                                icon: "/up.svg",
                                                inview: true
                                            },
                                            {
                                                latitude: booking.deliveryAddress.latitude,
                                                longitude: booking.deliveryAddress.longitude,
                                                icon: "/down.svg",
                                                inview: true
                                            },

                                        ]}
                                        lines={[[
                                            {
                                                latitude: booking.pickupAddress.latitude,
                                                longitude: booking.pickupAddress.longitude,
                                                icon: "/up.svg",
                                            },
                                            {
                                                latitude: booking.deliveryAddress.latitude,
                                                longitude: booking.deliveryAddress.longitude,
                                                icon: "/down.svg",
                                            },

                                        ]]}
                                    />
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <div className="flex justify-between gap-4 items-start">
                                    <div className="border p-2 border-gray-200 rounded-md">
                                        <img src={vehicleClassMap[booking?.vehicleClass].icon} alt={booking?.vehicleClass} className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <CurrentStatusText eta={eta} booking={booking} />
                                        {lastUpdated && <p className="mt-2 text-sm text-gray-500">Updated {" "}
                                            <TimeAgo date={new Date(lastUpdated)} />
                                        </p>}
                                    </div>
                                </div>
                                <Button
                                    size="sm" variant={"outline"} onClick={refreshBookingData}>
                                    <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
                                </Button>
                            </div>

                            {/* Driver-specific status update buttons */}
                            {isDriver && (
                                <div className="flex flex-col gap-4">
                                    {booking?.status === BookingStatus.ACCEPTED
                                        && eta?.distance && Number(eta?.distance) < 0.2 && (
                                        <Button 
                                            className="bg-green-600 text-white hover:text-white hover:bg-green-700 transition-colors flex-1" 
                                            variant="outline"
                                            onClick={() => handleStatusUpdate("ARRIVED")}
                                        >
                                            <LucideCheck className="h-4 w-4 mr-2" />
                                            I have arrived
                                        </Button>
                                    )}
                                    {booking?.status === BookingStatus.ARRIVED && (
                                        <Button 
                                            className="bg-green-600 text-white hover:text-white hover:bg-green-700 transition-colors flex-1" 
                                            variant="outline"
                                            onClick={() => handleStatusUpdate("PICKED_UP")}
                                        >
                                            <LucideCheck className="h-4 w-4 mr-2" />
                                            Mark as Picked Up
                                        </Button>
                                    )}
                                    {booking?.status === BookingStatus.PICKED_UP && (
                                        <Button 
                                            className="bg-blue-600 text-white hover:text-white hover:bg-blue-700 transition-colors flex-1" 
                                            variant="outline"
                                            onClick={() => handleStatusUpdate("IN_TRANSIT")}
                                        >
                                            <LucideCheck className="h-4 w-4 mr-2" />
                                            Start Delivery
                                        </Button>
                                    )}
                                    {booking?.status === BookingStatus.IN_TRANSIT && eta?.distance && Number(eta?.distance) < 0.2 && (
                                        <Button 
                                            className="bg-green-600 text-white hover:text-white hover:bg-green-700 transition-colors flex-1" 
                                            variant="outline"
                                            onClick={() => handleStatusUpdate("DELIVERED")}
                                        >
                                            <LucideCheck className="h-4 w-4 mr-2" />
                                            Mark as Delivered
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* User-specific buttons */}
                            {!isDriver && (
                                <div className="flex space-x-4">
                                    {booking?.driverId && booking.status !== BookingStatus.DELIVERED && (
                                        <Button className="flex-1" variant="outline" type="button">
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Message Driver
                                        </Button>
                                    )}
                                    {canCancelBooking && (
                                        <Button
                                            type="button"
                                            className="text-red-500 hover:text-red-600 flex-1"
                                            variant="outline"
                                            disabled={cancelBookingMutation.isPending || !bookingId}
                                            onClick={handleCancelBooking}
                                        >
                                            <LucideCircleX className="h-4 w-4 mr-2" />
                                            {cancelBookingMutation.isPending ? "Cancelling..." : "Cancel Booking"}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Driver message button */}
                            {isDriver && booking?.userId && booking.status !== BookingStatus.DELIVERED && (
                                <div className="flex space-x-4">
                                    <Button className="flex-1" variant="outline" type="button">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Message User
                                    </Button>
                                </div>
                            )}

                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function CurrentStatusText({ booking, eta }: { booking: Booking; eta?: { distance: number; duration: number } | null }) {
    if (booking.status === BookingStatus.BOOKED) {
        return (

            <div>
                <h4 className="">
                    Finding Delivery Partner.
                </h4>
                <h4 className="">
                    Please wait.
                </h4>
            </div>

        )
    } else if (booking.status === BookingStatus.ACCEPTED) {
        return (
            <div>
                {eta?.duration !== undefined && eta?.duration !== null && <h4 className="text-green-600 font-bold">
                    Arriving in {eta?.duration} mins
                </h4>}
                <h4 className="text-sm">
                    {booking.driver?.name} is on the way.
                </h4>
                {eta?.distance && <h4 className="text-sm">
                    {eta?.distance} km away
                </h4>}
            </div>
        )
    } else if (booking.status === BookingStatus.ARRIVED) {
        return (
            <div>
                <h4 className="">
                    {booking.driver?.name} has arrived.
                </h4>
                {eta?.distance && <h4 className="text-sm">
                    {eta?.distance} km away
                </h4>}
            </div>
        )
    }
    else if (booking.status === BookingStatus.PICKED_UP) {
        return (
            <div>
                <h4 className="">
                    {booking.driver?.name} has picked up the package.
                </h4>
                <h4>
                    {eta?.distance} km left
                </h4>
            </div>
        )
    } else if (booking.status === BookingStatus.IN_TRANSIT) {
        return (
            <div>
                <h4 className="">
                    {booking.driver?.name} is in transit.
                </h4>
                {eta?.duration && <h4 className="">
                    Will be delivered in {eta?.duration} mins
                </h4>}
                {eta?.distance && <h4>
                    {eta?.distance} km left
                </h4>}
            </div>
        )
    } else if (booking.status === BookingStatus.DELIVERED) {
        return (
            <div>
                <h4 className="">
                    Package delivered successfully.
                </h4>
                <h4 className="">
                    Delivered just now
                </h4>
            </div>
        )
    }
    else if (booking.status === BookingStatus.CANCELLED) {
        return (
            <div>
                <h4 className="">
                    Booking Cancelled.
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
                </h4>
            </div>
        )
    }
    else if (booking.status === BookingStatus.FAILED) {
        return (
            <div>
                <h4 className="">
                    Booking Failed.
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
                </h4>
            </div>
        )
    }
    else {
        return (
            <div>
                <h4 className="">
                    Loading...
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
                </h4>
            </div>
        )
    }

}

export default BookingDetailsPage
