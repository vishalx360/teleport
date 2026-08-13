'use client'
import Link from "next/link";

import { api } from "@/trpc/react";
import { BookingStatus } from "@/generated/prisma/enums";
import { ArrowRight, PackageOpen } from "lucide-react";
import TimeAgo from 'react-timeago';
import { formattedStatus } from "@/lib/constants";

export default function PastbookingsSection({ title = "Past deliveries" }: { title?: string }) {
    const { data: pastBookings, isLoading, error } = api.user.getAllBookings.useQuery();
    if (isLoading) return <p>Loading...</p>;

    if (error) return <div className="workspace-panel border-dashed p-6 text-sm text-slate-400">Your deliveries will appear here once your account is connected.</div>;
    return (
        <section>
            <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Route history</p><h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">Track current and completed requests.</p></div></div>
            {pastBookings?.length === 0 ? (
                <div className="workspace-panel grid place-items-center border-dashed px-5 py-12 text-center"><PackageOpen className="h-7 w-7 text-slate-500" /><p className="mt-3 font-semibold text-slate-200">No deliveries yet</p><p className="mt-1 text-sm text-slate-500">Your completed and active deliveries will appear here.</p></div>
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {pastBookings?.map((booking) => (
                        <PastBookingCard booking={booking} key={booking.id} />
                    ))}
                </div>
            )}
        </section>
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
        totalAmount: number;
        currency: string;
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
            className="workspace-panel group p-5 transition hover:-translate-y-0.5 hover:border-blue-400/50"
        >
            <div>
                <p className="font-semibold text-slate-100">
                    {booking.pickupAddress?.nickname} <ArrowRight className="inline" /> {booking.deliveryAddress.nickname}
                </p>
                <TimeAgo date={booking.createdAt} />

                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-blue-400">
                    {formattedStatus[booking.status]}
                </p>
            </div>
            <h1 className="mt-5 text-lg font-bold text-white">
                {new Intl.NumberFormat("en-IN", { style: "currency", currency: booking.currency }).format(booking.totalAmount / 100)}
            </h1>
        </Link>
    )
}
