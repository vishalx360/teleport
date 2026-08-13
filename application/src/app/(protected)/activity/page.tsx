"use client";

import BackButton from "@/components/BackButton";
import { Skeleton } from "@/components/ui/skeleton";
import { formattedStatus } from "@/lib/constants";
import { api } from "@/trpc/react";
import { ArrowRight, Clock3, PackageOpen, Route } from "lucide-react";
import Link from "next/link";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function ActivityPage() {
  const { data: bookings, isLoading } = api.user.getActivity.useQuery();

  return (
    <div className="h-full min-h-screen overflow-y-auto bg-[#101114] px-4 py-6 sm:px-6 lg:min-h-0 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <BackButton />
            <div>
              <p className="eyebrow">Delivery history</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Previous activity
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Review every delivery and open one to see its details.
              </p>
            </div>
          </div>
          <Clock3 className="hidden h-6 w-6 text-blue-400 sm:block" />
        </div>

        <div className="mt-7 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#17191e]">
          {isLoading && (
            <div className="space-y-3 p-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {!isLoading && !bookings?.length && (
            <div className="grid min-h-72 place-items-center px-6 text-center">
              <div>
                <PackageOpen className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 font-semibold text-white">No activity yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Completed and active deliveries will appear here.
                </p>
              </div>
            </div>
          )}

          {bookings?.map((booking) => (
            <Link
              key={booking.id}
              href={`/booking/${booking.id}`}
              className="group flex items-center gap-4 border-b border-white/10 p-4 transition last:border-0 hover:bg-white/[.04] sm:p-5"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                <Route className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-white">
                    {booking.pickupAddress.nickname} to{" "}
                    {booking.deliveryAddress.nickname}
                  </p>
                  <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    {formattedStatus[booking.status]}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">
                  {booking.pickupAddress.address} →{" "}
                  {booking.deliveryAddress.address}
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  {dateFormatter.format(new Date(booking.createdAt))}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
