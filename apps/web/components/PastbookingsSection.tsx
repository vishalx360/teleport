'use client'
import Link from "next/link";

import { formattedStatus } from "@/app/(protected)/booking/[bookingId]/page";
import { api } from "@/trpc/react";
import { BookingStatus } from "@repo/database";
import { ArrowRight } from "lucide-react";
import TimeAgo from 'react-timeago';

export default function PastbookingsSection() {
    const { data: pastBookings, isLoading, error } = api.user.getAllBookings.useQuery();
    if (isLoading) return <p>Loading...</p>;

    if (error) return <p>Error loading booking</p>;
    return (
        <div>
            <h3 className="font-bold mb-3 text">
                Past Bookings
            </h3>
            {pastBookings?.length === 0 ? (
                <div className="text-center text-sm text-gray-600 bg-gray-200 p-5 rounded-xl">No past bookings</div>
            ) : (
                <div className="overflow-y-scroll h-[50vh] flex mt-2 flex-col gap-4">
                    {pastBookings?.map((booking) => (
                        <PastBookingCard booking={booking} key={booking.id} />
                    ))}
                </div>
            )}
        </div>
    )
}

function PastBookingCard({ booking }: {
    booking: {
        pickupAddress: {
            address: string;
            nickname: string;
            id: string;
        };
        deliveryAddress: {
            address: string;
            nickname: string;
            id: string;
        };
    } & {
        status: BookingStatus;
        pickupAddressId: string;
        deliveryAddressId: string;
        distance: number;
        duration: number;
        price: number;
        id: string;
        userId: string;
        driverId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }
}) {
    return (
        <Link
            href={`/booking/${booking.id}`}
            className="rounded-xl p-4 px-5 flex items-center justify-between h-auto w-full transition-colors bg-gray-100 hover:bg-gray-200"
        >
            <div>
                <p className="font-bold text-md">
                    {booking.pickupAddress?.nickname} <ArrowRight className="inline" /> {booking.deliveryAddress.nickname}
                </p>
                <TimeAgo date={booking.createdAt} />

                <p className="text-xs text-gray-600">
                    {formattedStatus[booking.status]}
                </p>
            </div>
            <h1 className="font-bold text-lg">
                ₹{booking.price}
            </h1>
        </Link>
    )
}

