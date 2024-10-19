'use client'

import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { pusherClient } from "@/lib/pusherClient"
import { cn } from "@/lib/utils"
import { api } from '@/trpc/react'
import { Booking, BookingStatus } from "@prisma/client"
import { ArrowRight, LucideCircleX, MessageSquare, RefreshCw } from "lucide-react"
import Image from "next/image"
import { Channel } from "pusher-js"
import { useEffect, useState } from 'react'
import TimeAgo from 'react-timeago'
import { toast } from "sonner"
import MapView, { Coordinates } from "../../new-booking/MapView"
import { formattedStatus, vehicleClassMap, vehicles } from "@/lib/constants"
import Map from "../../new-booking/Map"


function BookingDetailsPage({ params }: {
    params: {
        bookingId: string
    }
}) {
    const { bookingId } = params;
    const { data, isLoading, error, isRefetching, dataUpdatedAt, refetch } = api.user.getBooking.useQuery(bookingId);
    const [lastUpdated, setLastUpdated] = useState(dataUpdatedAt)
    const [latestDriverLocation, setLatestDriverLocation] = useState<Coordinates | null>(null)
    const [latestEta, setLatestEta] = useState<{ distance: number; duration: number } | null>(null)

    const { booking, lastUpdatedDriverLocation, lastEta } = data ?? {}
    const driverLocation = latestDriverLocation ?? lastUpdatedDriverLocation
    const eta = latestEta ?? lastEta

    console.log({
        driverLocation,
        lastUpdatedDriverLocation,
        latestDriverLocation
    })
    useEffect(() => {
        setLastUpdated(dataUpdatedAt)
    }, [dataUpdatedAt])

    useEffect(() => {
        let bookingChannel: Channel | null = null;
        const channelName = `private-booking-${bookingId}`;

        if (bookingId) {
            console.log("Subscribing to channel", channelName);
            bookingChannel = pusherClient.subscribe(channelName);
            bookingChannel.bind("UPDATE", async (data) => {
                await refetch();
                toast.success(data.message);
            });
            bookingChannel.bind("DRIVER_LOCATION", async (data) => {
                console.log("Driver Location Updated", data);
                setLatestDriverLocation(data);
            });
            bookingChannel.bind("ETA_UPDATE", async (data) => {
                console.log("ETA Updated", data);
                setLatestEta(data);
            });
        }
        return () => {
            if (bookingChannel) {
                bookingChannel.unbind_all();
                pusherClient.unsubscribe(channelName);
            }
        };
    }, []);

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

                            {driverLocation ? (
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
                                                latitude: driverLocation.latitude,
                                                longitude: driverLocation.longitude,
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

function CurrentStatusText({ booking, eta }: { booking: Booking; eta?: { distance: number; duration: number } }) {
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
                    Delivered by {booking.driver?.name}.
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
