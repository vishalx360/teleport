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
import MapView from "../../new-booking/MapView"
import { vehicleIconMap } from "@/lib/constants"


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



function BookingDetailsPage({ params }: {
    params: {
        bookingId: string
    }
}) {
    const { bookingId } = params;
    const { data: booking, isLoading, error, isRefetching, dataUpdatedAt, refetch } = api.user.getBooking.useQuery(bookingId);
    const [lastUpdated, setLastUpdated] = useState(dataUpdatedAt)

    useEffect(() => {
        setLastUpdated(dataUpdatedAt)
    }, [dataUpdatedAt])

    useEffect(() => {
        let bookingChannel: Channel | null = null;
        const channelName = `booking-${bookingId}`;

        if (bookingId) {
            console.log("Subscribing to channel", channelName);
            bookingChannel = pusherClient.subscribe(channelName);
            bookingChannel.bind("UPDATE", async (data) => {
                await refetch();
                toast.success(data.message);
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
    const VehicleIcon = vehicleIconMap[booking?.vehicleId];

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
                            <div>
                                <MapView
                                    pickupLocation={booking.pickupAddress}
                                    deliveryLocation={booking.deliveryAddress}
                                    distance={booking?.distance}
                                    duration={booking?.duration}
                                />
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex justify-between gap-4 items-center">
                                    <div className="border p-2 border-gray-200 rounded-md">
                                        {VehicleIcon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Finding Delivery Partner...</h3>
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

export default BookingDetailsPage