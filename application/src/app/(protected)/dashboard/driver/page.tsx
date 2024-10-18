'use client'

import LinkButton from "@/components/LinkButton";
import PastbookingsSection from "@/components/PastbookingsSection";
import { ArrowRight } from "lucide-react";

export default function DriverDashboardPage() {
    return (
        <>
            <AcceptBookingSection />
            <PastbookingsSection />
        </>
    );
}

function AcceptBookingSection() {
    return (
        <div >
            <LinkButton href="/accept-bookings" variant={"outline"}
                className="rounded-xl p-4 px-5 flex items-center justify-between h-auto w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors hover:text-white">
                <div>
                    <h3 className="font-bold text-xl">
                        Accepting Bookings
                    </h3>
                    <p className="text-gray-100">
                        Start accepting bookings and earn money
                    </p>
                </div>
                <ArrowRight />
            </LinkButton>
        </div>)
}
