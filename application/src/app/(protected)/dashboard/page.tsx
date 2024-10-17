'use client'
import Link from "next/link";

import LinkButton from "@/components/LinkButton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, InfoIcon, Package, UserCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { api } from "@/trpc/react";
import { Booking, BookingStatus } from "@prisma/client";
import TimeAgo from 'react-timeago'
import { inferRouterOutputs } from "@trpc/server";
import { formattedStatus } from "../bookings/[bookingId]/page";

export default function DashboardPage() {

  const { data: session, status } = useSession()
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader className='gap-2'>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold mt-2">
              <Package className="inline" /> Teleport
            </CardTitle>
            <div className="flex gap-4 justify-center items-center">
              <div className="text-right">
                <p className="font-bold">
                  {status === "loading" ? "Loading..." : session?.user.name}
                </p>
                {session?.user.role && <p className="text-xs font-bold">
                  {session?.user.role}
                </p>}
                <button variant={"ghost"} className="text-red-600" onClick={signOut}>
                  Logout
                </button>
              </div>
              <UserCircle />
            </div>
          </div>
          <CardDescription className="text-sm text-gray-600">
            Send anything, anywhere
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NewBookingSection />
          <PastbookingsSection />
        </CardContent>
        <CardFooter>

        </CardFooter>
      </Card>
    </div>
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

function PastbookingsSection() {
  const { data: pastBookings, isLoading, error } = api.user.getAllBookings.useQuery();
  if (isLoading) return <p>Loading...</p>;

  if (error) return <p>Error loading booking</p>;
  return (
    <div>
      <h3 className="font-bold text">
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
      href={`/bookings/${booking.id}`}
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

