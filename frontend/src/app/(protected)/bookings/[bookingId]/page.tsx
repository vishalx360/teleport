"use client";

import { api } from '@/trpc/react';

function BookingDetailsPage({ params }) {
    const { bookingId } = params;
    const { data: booking, isLoading, error } = api.user.getBooking.useQuery(bookingId);
    if (isLoading) return <p>Loading...</p>;

    if (error) return <p>Error loading booking</p>;


    return (
        <div>
            <pre>
                {JSON.stringify(booking, null, 2)}
            </pre>
        </div>
    )
}

export default BookingDetailsPage