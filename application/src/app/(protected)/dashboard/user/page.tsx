'use client'
import Link from "next/link";

import LinkButton from "@/components/LinkButton";
import { api } from "@/trpc/react";
import { BookingStatus } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import TimeAgo from 'react-timeago';
import { formattedStatus } from "../../booking/[bookingId]/page";
import PastbookingsSection from "@/components/PastbookingsSection";

export default function UserDashboardPage() {
  return (
    <>
      <NewBookingSection />
      <PastbookingsSection />
    </>
  );
}

function NewBookingSection() {
  return (
    <div >
      <LinkButton href="/booking" variant={"outline"}
        className="rounded-xl p-4 px-5 flex items-center justify-between h-auto w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors hover:text-white">
        <div>
          <h3 className="font-bold text-xl">
            Pick up or Send anything
          </h3>
          <p className="text-gray-100">
            Enter pick up and delivery locations
          </p>
        </div>
        <ArrowRight />
      </LinkButton>
    </div>)
}
