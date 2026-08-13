"use client";

import AddressCreationPanel from "@/components/addresses/AddressCreationPanel";
import useAddressMapSelection from "@/components/addresses/useAddressMapSelection";
import MapboxMap, {
  type MapCoordinates,
  type MapMarker,
  type MapViewportBounds,
} from "@/components/maps/MapboxMap";
import { Skeleton } from "@/components/ui/skeleton";
import { formattedStatus } from "@/lib/constants";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Home,
  MapPin,
  PackageOpen,
  PackagePlus,
  Route,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo, useState } from "react";

const nearbyDriverLabels = {
  BIKE: "Bike driver",
  PICKUP_TRUCK: "Pickup driver",
  TRUCK: "Truck driver",
} as const;
const activeBookingStatuses = new Set([
  "BOOKED",
  "ACCEPTED",
  "ARRIVED",
  "PICKED_UP",
  "IN_TRANSIT",
]);
const activePaymentStatuses = new Set(["AUTHORIZED", "PAID"]);
type CustomerBookings = RouterOutputs["user"]["getAllBookings"];

function relativeTime(date: Date) {
  const elapsedSeconds = Math.round(
    (new Date(date).getTime() - Date.now()) / 1_000,
  );
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(elapsedSeconds) < 60)
    return formatter.format(elapsedSeconds, "second");
  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (Math.abs(elapsedMinutes) < 60)
    return formatter.format(elapsedMinutes, "minute");
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24)
    return formatter.format(elapsedHours, "hour");
  return formatter.format(Math.round(elapsedHours / 24), "day");
}

function SavedAddresses({ onAddAddress }: { onAddAddress: () => void }) {
  const { data: addresses, isLoading } = api.user.getAddresses.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {addresses?.slice(0, 3).map((address) => (
        <div
          key={address.id}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
            {address.nickname.toLowerCase() === "home" ? (
              <Home className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-white">{address.nickname}</p>
            <p className="truncate text-xs text-slate-400">{address.address}</p>
          </div>
        </div>
      ))}
      {!addresses?.length && (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-500">
          Save an address for quicker bookings.
        </div>
      )}
      <button
        type="button"
        onClick={onAddAddress}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] text-sm font-medium text-slate-200 transition hover:bg-white/[.08]"
      >
        <PackagePlus className="h-4 w-4" />
        Add new address
      </button>
    </div>
  );
}

function RecentDeliveries({
  bookings,
  isLoading,
}: {
  bookings: CustomerBookings | undefined;
  isLoading: boolean;
}) {
  const recent = useMemo(
    () =>
      [...(bookings ?? [])]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 3),
    [bookings],
  );

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#15171c]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">Recent deliveries</p>
          <p className="text-xs text-slate-400">
            Track your latest parcel activity
          </p>
        </div>
        <Link
          href="/activity"
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/10 hover:text-blue-200"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="space-y-1 p-2">
        {isLoading && <Skeleton className="h-20 w-full" />}
        {!isLoading && recent.length === 0 && (
          <div className="grid place-items-center px-5 py-8 text-center">
            <PackageOpen className="h-6 w-6 text-slate-500" />
            <p className="mt-2 text-sm text-slate-400">No deliveries yet</p>
          </div>
        )}
        {recent.map((booking) => (
          <Link
            key={booking.id}
            href={`/booking/${booking.id}`}
            className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
              <Route className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {booking.pickupAddress.nickname} to{" "}
                {booking.deliveryAddress.nickname}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-blue-400">
                  {formattedStatus[booking.status]}
                </span>
                <span>·</span>
                <span>{relativeTime(booking.createdAt)}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-white" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function CustomerPanel({ onAddAddress }: { onAddAddress: () => void }) {
  const { data: session } = useSession();
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#15171c]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <p className="eyebrow">Customer home</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {firstName ? `Where to, ${firstName}?` : "Where should it go?"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Send a parcel across town and follow every step from pickup to
          drop-off.
        </p>

        <Link
          href="/new-booking"
          className="mt-6 flex min-h-14 items-center justify-between rounded-2xl bg-blue-500 px-4 font-bold text-white transition hover:bg-blue-400"
        >
          <span className="flex items-center gap-3">
            <PackagePlus className="h-5 w-5" />
            New package delivery
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-7 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Saved addresses</h2>
            <p className="text-xs text-slate-500">
              Ready when you start a booking
            </p>
          </div>
          <MapPin className="h-4 w-4 text-blue-400" />
        </div>
        <div className="mt-3">
          <SavedAddresses onAddAddress={onAddAddress} />
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#111318]/95 px-5 py-4">
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Use the location button on the map to find yourself.
        </p>
      </div>
    </section>
  );
}

export default function UserDashboardPage() {
  const { data: addresses } = api.user.getAddresses.useQuery();
  const { data: bookings, isLoading: bookingsLoading } =
    api.user.getAllBookings.useQuery();
  const [addingAddress, setAddingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<MapCoordinates | null>(null);
  const [mapBounds, setMapBounds] = useState<MapViewportBounds | null>(null);
  const nearbySearchCenter = useMemo(
    () => ({
      // Only crossing roughly a one-kilometre grid boundary starts a new
      // request while the user pans the map.
      latitude: Math.round((mapCenter?.latitude ?? 0) * 100) / 100,
      longitude: Math.round((mapCenter?.longitude ?? 0) * 100) / 100,
    }),
    [mapCenter?.latitude, mapCenter?.longitude],
  );
  const hasActiveBooking = useMemo(
    () =>
      bookings?.some(
        (booking) =>
          activeBookingStatuses.has(booking.status) &&
          activePaymentStatuses.has(booking.paymentStatus),
      ) ?? false,
    [bookings],
  );
  const { data: nearbyDrivers } = api.user.getNearbyDrivers.useQuery(
    nearbySearchCenter,
    {
      enabled:
        !addingAddress &&
        mapCenter !== null &&
        bookings !== undefined &&
        !hasActiveBooking,
      refetchInterval: 120_000,
      refetchOnWindowFocus: false,
      staleTime: 120_000,
    },
  );
  const {
    selection,
    isResolving,
    selectCoordinates,
    selectLocation,
    resetSelection,
  } = useAddressMapSelection();
  const markers = useMemo<MapMarker[]>(() => {
    if (addingAddress && selection) {
      return [
        {
          id: "new-address",
          latitude: selection.latitude,
          longitude: selection.longitude,
          kind: "current",
          label: "New address",
        },
      ];
    }

    const addressMarkers: MapMarker[] = (addresses ?? []).map((address) => ({
      id: address.id,
      latitude: address.latitude,
      longitude: address.longitude,
      kind: "default",
      label: address.nickname,
    }));
    const driverMarkers: MapMarker[] = hasActiveBooking
      ? []
      : (nearbyDrivers?.drivers ?? []).map((driver) => ({
          id: `nearby-driver-${driver.id}`,
          latitude: driver.latitude,
          longitude: driver.longitude,
          kind: "driver",
          label: `Nearby ${nearbyDriverLabels[driver.vehicleClass].toLowerCase()}`,
          includeInBounds: false,
          labelVisibility: "click",
        }));

    return [...addressMarkers, ...driverMarkers];
  }, [
    addresses,
    addingAddress,
    hasActiveBooking,
    nearbyDrivers?.drivers,
    selection,
  ]);

  const stopAddingAddress = () => {
    resetSelection();
    setAddingAddress(false);
  };

  return (
    <div className="min-h-screen bg-[#101114] pb-24 lg:h-full lg:min-h-0 lg:pb-0">
      <div className="relative flex h-full flex-col gap-4 p-4 sm:p-6 lg:block lg:p-0">
        <div className="relative order-2 h-72 overflow-hidden rounded-[1.75rem] lg:h-full lg:rounded-none">
          <MapboxMap
            markers={markers}
            className="rounded-[1.75rem] lg:rounded-none"
            ariaLabel="Customer delivery map"
            showCurrentLocation
            selectionMode={addingAddress}
            onMapClick={addingAddress ? selectCoordinates : undefined}
            onCurrentLocation={addingAddress ? selectCoordinates : undefined}
            onViewportChange={(center, bounds) => {
              setMapCenter(center);
              setMapBounds(bounds);
            }}
          />
          {addingAddress && (
            <div className="pointer-events-none absolute left-1/2 top-5 hidden -translate-x-1/2 rounded-2xl border border-blue-400/30 bg-[#111318]/90 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur lg:block">
              Click the map to place your address
            </div>
          )}
          {!addingAddress && !hasActiveBooking && nearbyDrivers?.visible && (
            <div className="pointer-events-none absolute bottom-8 left-3 rounded-xl border border-white/10 bg-[#111318]/90 px-3 py-2 text-xs font-medium text-slate-300 shadow-lg backdrop-blur lg:bottom-5 lg:left-[440px]">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-400" />
              {nearbyDrivers.drivers.length > 0
                ? `${nearbyDrivers.drivers.length} nearby ${nearbyDrivers.drivers.length === 1 ? "driver" : "drivers"} · approximate locations`
                : "No online drivers nearby right now"}
            </div>
          )}
        </div>

        <div className="z-10 order-1 lg:absolute lg:inset-y-5 lg:left-5 lg:w-[400px]">
          {addingAddress ? (
            <AddressCreationPanel
              selection={selection}
              isResolving={isResolving}
              onSelectLocation={selectLocation}
              searchProximity={mapCenter}
              searchBounds={mapBounds}
              onCancel={stopAddingAddress}
              onSaved={stopAddingAddress}
            />
          ) : (
            <CustomerPanel
              onAddAddress={() => {
                resetSelection();
                setAddingAddress(true);
              }}
            />
          )}
        </div>

        {!addingAddress && (
          <div className="z-10 order-3 lg:absolute lg:right-5 lg:top-5 lg:w-[390px]">
            <RecentDeliveries bookings={bookings} isLoading={bookingsLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
