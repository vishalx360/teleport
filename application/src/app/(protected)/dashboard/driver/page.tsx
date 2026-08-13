"use client";

import DeliveryMap from "@/components/maps/DeliveryMap";
import MapboxMap, { type MapMarker } from "@/components/maps/MapboxMap";
import useActiveLocation from "@/hooks/useActiveLocation";
import { formattedStatus, vehicleClassMap } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  PackageCheck,
  Radio,
  Route,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo } from "react";

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) return `${distanceMeters} m`;
  return `${(distanceMeters / 1_000).toFixed(1)} km`;
}

function DriverHomeSkeleton() {
  return (
    <div className="animate-pulse rounded-[1.75rem] border border-white/10 bg-[#15171c]/95 p-6 shadow-2xl backdrop-blur-xl">
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="mt-4 h-8 w-3/4 rounded bg-white/10" />
      <div className="mt-3 h-4 w-full rounded bg-white/10" />
      <div className="mt-6 h-14 w-full rounded-2xl bg-white/10" />
    </div>
  );
}

export default function DriverDashboardPage() {
  const { data: session } = useSession();
  const { currentCoords, positionError } = useActiveLocation({
    updateInterval: 5 * 60,
    distanceThreshold: 500,
  });
  const currentBooking = api.driver.getCurrentBooking.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const availability = api.driver.getAvailablity.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const activity = api.user.getActivity.useQuery();

  const active = currentBooking.data;
  const booking = active?.booking;
  const isOnline = availability.data?.available === true;
  const vehicle = session?.user.vehicleClass
    ? vehicleClassMap[session.user.vehicleClass]
    : undefined;

  const completed = useMemo(
    () => activity.data?.filter((item) => item.status === "DELIVERED") ?? [],
    [activity.data],
  );
  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return completed.filter(
      (item) => item.deliveredAt?.toDateString() === today,
    ).length;
  }, [completed]);
  const completedDistance = completed.reduce(
    (total, item) => total + item.distanceMeters,
    0,
  );

  const idleMarkers = useMemo<MapMarker[]>(
    () =>
      currentCoords
        ? [
            {
              id: "driver-location",
              ...currentCoords,
              kind: "driver",
              label: "You are here",
              labelVisibility: "always",
            },
          ]
        : [],
    [currentCoords],
  );

  const heading = session?.user.name
    ? `Hi, ${session.user.name.split(" ")[0]}`
    : "Driver home";
  const nextIsPickup =
    booking?.status === "ACCEPTED" || booking?.status === "ARRIVED";
  const nextAddress = nextIsPickup
    ? booking?.pickupAddress.address
    : booking?.deliveryAddress.address;
  const currentMapLocation = currentCoords ?? active?.lastUpdatedDriverLocation;
  const isLoading = currentBooking.isLoading || availability.isLoading;

  return (
    <div className="relative min-h-[calc(100svh-72px)] overflow-hidden bg-[#101114] text-slate-100 lg:h-full lg:min-h-0">
      {booking ? (
        <DeliveryMap
          pickup={booking.pickupAddress}
          dropoff={booking.deliveryAddress}
          currentLocation={currentMapLocation}
          className="absolute inset-0 rounded-none"
        />
      ) : (
        <MapboxMap
          markers={idleMarkers}
          showCurrentLocation
          ariaLabel="Driver home map"
          className="absolute inset-0 rounded-none"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75" />

      <header className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3 sm:left-6 sm:right-6 sm:top-6">
        <div className="bg-[#121318]/92 rounded-2xl border border-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-5">
          <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            {heading}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                booking
                  ? "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,.7)]"
                  : isOnline
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.7)]"
                    : "bg-slate-500",
              )}
            />
            {booking ? "Delivery in progress" : isOnline ? "Online" : "Offline"}
          </p>
        </div>

        {vehicle && (
          <Link
            href="/settings"
            className="bg-[#121318]/92 flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2.5 shadow-2xl backdrop-blur-xl transition hover:border-blue-400/40 hover:bg-[#191b21]"
          >
            <img src={vehicle.icon} alt="" className="h-9 w-9" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-white">{vehicle.name}</p>
              <p className="text-[10px] text-slate-500">View vehicle</p>
            </div>
          </Link>
        )}
      </header>

      <section className="absolute bottom-4 left-4 right-4 z-10 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[440px] lg:bottom-7 lg:left-7">
        {isLoading ? (
          <DriverHomeSkeleton />
        ) : booking ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-[#15171c]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                  <Route className="h-3.5 w-3.5" /> Active delivery
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {nextIsPickup ? "Head to pickup" : "Head to drop-off"}
                </h1>
              </div>
              <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-300">
                {formattedStatus[booking.status]}
              </span>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Next stop
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-white">
                  {nextAddress}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/[0.035] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" /> ETA
                </p>
                <p className="mt-1 font-semibold text-white">
                  {active.lastEta
                    ? `${active.lastEta.duration} min`
                    : "Updating"}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.035] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Navigation className="h-3.5 w-3.5" /> Distance
                </p>
                <p className="mt-1 font-semibold text-white">
                  {active.lastEta
                    ? `${active.lastEta.distance} km`
                    : "Updating"}
                </p>
              </div>
            </div>

            <Link
              href="/current-booking"
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-base font-bold text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15171c]"
            >
              Manage delivery <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-white/10 bg-[#15171c]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                  isOnline
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-blue-500/15 text-blue-300",
                )}
              >
                {isOnline ? (
                  <Radio className="h-5 w-5" />
                ) : (
                  <PackageCheck className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                  {isOnline ? "You’re online" : "Ready when you are"}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {isOnline
                    ? "Waiting for a nearby request"
                    : "Start finding deliveries"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isOnline
                    ? "Keep the offers screen open so you can respond before a request expires."
                    : positionError
                      ? "Enable location access to see and accept nearby parcel requests."
                      : "Go online when you’re ready. We’ll only share your approximate waiting location."}
                </p>
              </div>
            </div>

            <Link
              href="/accept-bookings"
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-base font-bold text-white transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15171c]"
            >
              {isOnline ? "Return to live offers" : "Find deliveries"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      <aside className="bg-[#15171c]/92 absolute bottom-7 right-7 z-10 hidden w-72 overflow-hidden rounded-[1.5rem] border border-white/10 shadow-2xl backdrop-blur-xl xl:block">
        <div className="border-b border-white/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Delivery summary
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-semibold text-white">
                {completedToday}
              </p>
              <p className="mt-1 text-xs text-slate-500">Today</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">
                {completed.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-blue-300" /> Distance
              delivered
            </span>
            <span className="font-semibold text-white">
              {formatDistance(completedDistance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-400">
              <Bike className="h-4 w-4 text-blue-300" /> Vehicle
            </span>
            <span className="font-semibold text-white">
              {vehicle?.name ?? "Not selected"}
            </span>
          </div>
          <Link
            href="/activity"
            className="mt-2 flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 transition hover:border-blue-400/40 hover:text-white"
          >
            View delivery activity <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
