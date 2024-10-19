'use client'

import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { pusherClient } from "@/lib/pusherClient"
import { cn } from "@/lib/utils"
import { api } from '@/trpc/react'
import { BookingStatus } from "@repo/database"
import { ArrowRight, LucideCircleX, MessageSquare, RefreshCw } from "lucide-react"
import Image from "next/image"
import { Channel } from "pusher-js"
import { useEffect, useState } from 'react'
import TimeAgo from 'react-timeago'
import { toast } from "sonner"
import { vehicleClassMap, vehicles } from "@/lib/constants"
import MapView, { Coordinates } from "../new-booking/MapView"
import { useGeolocated } from "react-geolocated"
import Map from "../new-booking/Map"
import useActiveLocation from "@/hooks/useActiveLocation"


export const formattedStatus: Record<BookingStatus | "LOADING", string> = {
    [BookingStatus.BOOKED]: "Booked",
    [BookingStatus.ACCEPTED]: "Accepted",
    [BookingStatus.ARRIVED]: "Arrived",
    [BookingStatus.PICKED_UP]: "Picked Up",
    [BookingStatus.IN_TRANSIT]: "In Transit",
    [BookingStatus.DELIVERED]: "Delivered",
    [BookingStatus.CANCELLED]: "Cancelled",
    [BookingStatus.FAILED]: "Failed",
    "LOADING": "Loading..."
};

function useBookingChannel(bookingId: string, updater: () => void) {
    useEffect(() => {
        if (!bookingId) return
        let bookingChannel: Channel | null = null;
        const channelName = `private-booking-${bookingId}`;

        console.log("Subscribing to channel", channelName);
        bookingChannel = pusherClient.subscribe(channelName);
        bookingChannel.bind("UPDATE", async (data) => {
            await updater();
            toast.success(data.message);
        });
        return () => {
            if (bookingChannel) {
                bookingChannel.unbind_all();
                pusherClient.unsubscribe(channelName);
            }
        };
    }, [bookingId]);
}

function CurrentBookingPage() {
    const { data: booking, isLoading, error, isRefetching, dataUpdatedAt, refetch } = api.driver.getCurrentBooking.useQuery();
    const [lastUpdated, setLastUpdated] = useState(dataUpdatedAt)
    const { currentCoords: driverLocation } = useActiveLocation({
        updateInterval: 30,
        distanceThreshold: 200
    });


    useBookingChannel(booking?.id, refetch);

    const { mutateAsync: updateLocation, isPending: updatingLocation } = api.driver.updateLocation.useMutation();

    useEffect(() => {
        if (!driverLocation?.latitude || !driverLocation?.longitude) return;
        updateLocation({
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            bookingId: booking?.id
        });
    }, [driverLocation, booking]);

    useEffect(() => {
        setLastUpdated(dataUpdatedAt)
    }, [dataUpdatedAt])

    if (error) return <p>Error loading booking</p>;
    if (!booking && !isLoading) return <p>Booking not found</p>

    const refreshEta = async () => {
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

                            {driverLocation ? (
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
                                                latitude: driverLocation.latitude,
                                                longitude: driverLocation.longitude,
                                                icon: "/location.svg",
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
                                                latitude: driverLocation.latitude,
                                                longitude: driverLocation.longitude,
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
                                <div className="flex justify-between gap-4 items-center">
                                    <div className="border p-2 border-gray-200 rounded-md">
                                        <img src={vehicleClassMap[booking?.vehicleClass].icon} alt={booking?.vehicleClass} className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <CurrentStatusText booking={booking} />
                                        {lastUpdated && <p className="text-sm text-gray-500">Updated {" "}
                                            <TimeAgo date={new Date(lastUpdated)} />
                                        </p>}
                                    </div>
                                </div>
                                <Button
                                    size="sm" variant={"outline"} onClick={refreshEta}>
                                    <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
                                </Button>
                            </div>

                            <div className="flex space-x-4">
                                {booking?.driverId && <Button className="flex-1" variant="outline">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Message Driver
                                </Button>}
                                <Button className="text-red-500 hover:text-red-600 flex-1" variant="outline">
                                    <LucideCircleX className="h-4 w-4 mr-2" />
                                    Cancel Booking
                                </Button>
                            </div>

                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function CurrentStatusText({ booking }: { booking: Booking }) {
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
        // const {dis} = getDistanceAndDuration(booking.pickupAddress, booking.deliveryAddress)
        return (
            <div>
                <h4 className="">
                    Move to the pickup location.
                </h4>
                <h4 className="">
                    Arriving in X mins
                </h4>
            </div>
        )
    } else if (booking.status === BookingStatus.ARRIVED) {
        return (
            <div>
                <h4 className="">
                    You have arrived.
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
                </h4>
            </div>
        )
    }
    else if (booking.status === BookingStatus.PICKED_UP) {
        return (
            <div>
                <h4 className="">
                    Move to the delivery location.
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
                </h4>
            </div>
        )
    } else if (booking.status === BookingStatus.IN_TRANSIT) {
        return (
            <div>
                <h4 className="">
                    You are in transit.
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
                </h4>
            </div>
        )
    } else if (booking.status === BookingStatus.DELIVERED) {
        return (
            <div>
                <h4 className="">
                    You have delivered the package.
                </h4>
                <h4 className="">
                    Booked <TimeAgo date={new Date(booking.createdAt)} />
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

export default CurrentBookingPage