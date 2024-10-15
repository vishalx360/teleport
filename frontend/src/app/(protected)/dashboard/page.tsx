'use client'
import Link from "next/link";

import LinkButton from "@/components/LinkButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, InfoIcon, Package, UserCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

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
            <Button variant="ghost" className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-bold">
                  {status === "loading" ? "Loading..." : session?.user.name}
                </p>
                <p className="capitalize bg-blue-500 text-white rounded-xl w-fit px-4">
                  {String(session?.user.role).toLowerCase()}
                </p>
              </div>
              <Button className="text-red-600" onClick={signOut}>
                Logout
              </Button>
              <UserCircle />
            </Button>
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

type Booking = {
  id: number;
  from: string;
  to: string;
  cost: number;
  date: Date;
}

function PastbookingsSection() {
  const [pastBookings, setPastBookings] = useState<Array<Booking>>([
    {
      id: 1,
      from: "Home",
      to: "Work",
      cost: 200,
      date: new Date()
    },
    {
      id: 2,
      from: "Home",
      to: "Work",
      cost: 200,
      date: new Date()
    },
    {
      id: 3,
      from: "Home",
      to: "Work",
      cost: 200,
      date: new Date()
    },
    {
      id: 4,
      from: "Home",
      to: "Work",
      cost: 200,
      date: new Date()
    },
    {
      id: 5,
      from: "Home",
      to: "Work",
      cost: 200,
      date: new Date()
    },
  ]);
  return (
    <div>
      <h3 className="font-bold text">
        Past Bookings
      </h3>
      {pastBookings.length === 0 ? (
        <div className="text-center text-sm text-gray-600 bg-gray-200 p-5 rounded-xl">No past bookings</div>
      ) : (
        <div className="overflow-y-scroll h-[50vh] flex mt-2 flex-col gap-4">
          {pastBookings.map((booking) => (
            <PastBookingCard key={booking.id} />
          ))}
        </div>
      )}
    </div>
  )
}

function PastBookingCard() {
  return (
    <Link href="/booking/123" className="rounded-xl p-4 px-5 flex items-center justify-between h-auto w-full  transition-colors bg-gray-100 hover:bg-gray-200">
      <div>
        <p className="font-bold text-sm ">
          <Package className="inline h-4 w-4" /> Booking ID: #34234
        </p>
        <h3 className="text-sm">
          5 days ago
        </h3>
        <p className="text-xs text-gray-600">
          From: Home, To: Work Rs. 200
        </p>

      </div>
      <InfoIcon />
    </Link>
  )
}

