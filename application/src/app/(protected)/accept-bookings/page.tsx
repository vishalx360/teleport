"use client";

import BackButton from "@/components/BackButton";
import DeliveryMap from "@/components/maps/DeliveryMap";
import MapboxMap, {
  type MapCoordinates,
  type MapMarker,
} from "@/components/maps/MapboxMap";
import { Skeleton } from "@/components/ui/skeleton";
import useActiveLocation from "@/hooks/useActiveLocation";
import { GetAddressFromCoordinates } from "@/lib/geoUtils";
import { vehicleClassMap } from "@/lib/constants";
import { pusherClient } from "@/lib/pusherClient";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import {
  Check,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  PackageCheck,
  Power,
  Radio,
  Route,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type BookingRequest = {
  booking: {
    id: string;
    vehicleClass: string;
    distanceMeters: number;
    durationSeconds: number;
    totalAmount: number;
    currency: string;
    pickupAddress: MapCoordinates & { nickname: string; address: string };
    deliveryAddress: MapCoordinates & { nickname: string; address: string };
  };
  acceptBefore: Date;
  responseToken: string;
};

function formatOnlineTime(startedAt: number | null, now: number) {
  if (!startedAt) return "0 min";
  const minutes = Math.max(0, Math.floor((now - startedAt) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function SearchPulse() {
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center">
      <span className="absolute h-12 w-12 animate-ping rounded-full bg-blue-400/15 [animation-duration:2.4s]" />
      <span className="absolute h-10 w-10 rounded-full border border-blue-400/25" />
      <Radio className="relative h-5 w-5 text-blue-300" />
    </span>
  );
}

function OnlineStatusCard({
  address,
  vehicleName,
  onlineSince,
  now,
  locationError,
  realtimeReady,
  isChanging,
  onGoOffline,
}: {
  address: string;
  vehicleName: string;
  onlineSince: number | null;
  now: number;
  locationError?: string;
  realtimeReady: boolean;
  isChanging: boolean;
  onGoOffline: () => void;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#15171c]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6">
      <div className="flex items-start gap-4">
        <SearchPulse />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)]" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              You’re online
            </p>
          </div>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {realtimeReady
              ? "Looking for delivery requests"
              : "Connecting to delivery requests"}
          </h1>
          <p className="mt-1 text-sm leading-5 text-slate-400">
            Stay nearby. We’ll show the route and payout before you accept.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Clock3 className="h-3.5 w-3.5" /> Online
          </p>
          <p className="mt-1.5 font-semibold text-white">
            {formatOnlineTime(onlineSince, now)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <PackageCheck className="h-3.5 w-3.5" /> Vehicle
          </p>
          <p className="mt-1.5 truncate font-semibold text-white">
            {vehicleName}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3.5">
        <LocateFixed className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white">Current area</p>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-xs leading-5",
              locationError ? "text-amber-300" : "text-slate-400",
            )}
          >
            {locationError || address || "Finding your location…"}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isChanging}
        onClick={onGoOffline}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.045] text-sm font-bold text-slate-200 transition hover:bg-white/[.09] disabled:opacity-50"
      >
        <Power className="h-4 w-4" />
        {isChanging ? "Going offline…" : "Go offline"}
      </button>
    </section>
  );
}

function OfflineStatusCard({
  vehicleName,
  hasLocation,
  locationError,
  isChanging,
  onGoOnline,
}: {
  vehicleName: string;
  hasLocation: boolean;
  locationError?: string;
  isChanging: boolean;
  onGoOnline: () => void;
}) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[#15171c]/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6">
      <p className="eyebrow">Driver mode</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        You’re offline
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Go online when you’re ready to receive nearby parcel requests.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
          <Navigation className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">{vehicleName}</p>
          <p className="text-xs text-slate-500">
            {locationError
              ? locationError
              : hasLocation
                ? "Location ready"
                : "Getting your location…"}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isChanging || !hasLocation}
        onClick={onGoOnline}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 text-base font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/35"
      >
        <Power className="h-5 w-5" />
        {isChanging ? "Going online…" : "Go online"}
      </button>
      {!hasLocation && !locationError && (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Waiting for location permission before going online.
        </p>
      )}
    </section>
  );
}

function OfferCard({
  request,
  onDismiss,
}: {
  request: BookingRequest;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const initialDuration = useRef(
    Math.max(1, request.acceptBefore.getTime() - Date.now()),
  );
  const [timeLeft, setTimeLeft] = useState(initialDuration.current);
  const response = api.driver.bookingResponse.useMutation();
  const { booking } = request;

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(
        0,
        request.acceptBefore.getTime() - Date.now(),
      );
      setTimeLeft(remaining);
      if (remaining === 0) onDismiss();
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [onDismiss, request.acceptBefore]);

  const respond = async (accepted: boolean) => {
    try {
      await response.mutateAsync({
        bookingId: booking.id,
        accepted,
        responseToken: request.responseToken,
      });
      if (accepted) {
        toast.success("Delivery accepted");
        router.push("/current-booking");
      } else {
        toast.success("Offer declined. You’re still online.");
        onDismiss();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send your response",
      );
    }
  };

  const progress = Math.min(
    100,
    Math.max(0, (timeLeft / initialDuration.current) * 100),
  );
  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: booking.currency,
    maximumFractionDigits: 0,
  }).format(booking.totalAmount / 100);

  return (
    <section className="bg-[#15171c]/98 overflow-hidden rounded-[1.75rem] border border-blue-400/35 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <div className="h-1 bg-white/10">
        <div
          className="h-full bg-blue-400 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              Exclusive request
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
              {formattedAmount}
            </h1>
          </div>
          <span className="flex items-center gap-1.5 rounded-xl bg-blue-500/15 px-3 py-2 text-sm font-bold text-blue-200">
            <Timer className="h-4 w-4" />
            {Math.ceil(timeLeft / 1_000)}s
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex gap-3">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-[3px] border-blue-400 bg-[#15171c]" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pick up
              </p>
              <p className="mt-1 truncate font-semibold text-white">
                {booking.pickupAddress.nickname}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                {booking.pickupAddress.address}
              </p>
            </div>
          </div>
          <div className="ml-[5px] h-4 border-l border-dashed border-slate-600" />
          <div className="flex gap-3">
            <span className="mt-1 h-3 w-3 shrink-0 bg-blue-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Drop off
              </p>
              <p className="mt-1 truncate font-semibold text-white">
                {booking.deliveryAddress.nickname}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                {booking.deliveryAddress.address}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/[.045] p-3.5">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Route className="h-3.5 w-3.5" /> Distance
            </p>
            <p className="mt-1 font-semibold text-white">
              {(booking.distanceMeters / 1_000).toFixed(1)} km
            </p>
          </div>
          <div className="rounded-2xl bg-white/[.045] p-3.5">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="h-3.5 w-3.5" /> Est. time
            </p>
            <p className="mt-1 font-semibold text-white">
              {Math.ceil(booking.durationSeconds / 60)} min
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={response.isPending || timeLeft === 0}
          onClick={() => void respond(true)}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 text-base font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"
        >
          <Check className="h-5 w-5" /> Accept delivery
        </button>
        <button
          type="button"
          disabled={response.isPending}
          onClick={() => void respond(false)}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" /> Decline
        </button>
      </div>
    </section>
  );
}

export default function AcceptBookingsPage() {
  const { data: session } = useSession();
  const [address, setAddress] = useState("");
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(
    null,
  );
  const [onlineSince, setOnlineSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [realtimeReady, setRealtimeReady] = useState(false);
  const { currentCoords, positionError } = useActiveLocation({
    updateInterval: 60,
    distanceThreshold: 200,
  });
  const availability = api.driver.getAvailablity.useQuery();
  const setAvailability = api.driver.setAvailablity.useMutation();
  const updateLocation = api.driver.updateLocation.useMutation();
  const available = availability.data?.available === true;
  const vehicle = session?.user.vehicleClass
    ? vehicleClassMap[session.user.vehicleClass]
    : undefined;

  useEffect(() => {
    if (!session?.user.id) return;
    const handler = (
      data: Omit<BookingRequest, "acceptBefore"> & {
        acceptBefore: string | Date;
      },
    ) =>
      setBookingRequest({ ...data, acceptBefore: new Date(data.acceptBefore) });
    const channelName = `private-driver-${session.user.id}`;
    const channel = pusherClient.subscribe(channelName);
    const handleReady = () => setRealtimeReady(true);
    const handleError = () => setRealtimeReady(false);
    channel.bind("driver-booking-request", handler);
    channel.bind("pusher:subscription_succeeded", handleReady);
    channel.bind("pusher:subscription_error", handleError);
    return () => {
      channel.unbind("driver-booking-request", handler);
      channel.unbind("pusher:subscription_succeeded", handleReady);
      channel.unbind("pusher:subscription_error", handleError);
      pusherClient.unsubscribe(channelName);
      setRealtimeReady(false);
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!available) {
      setOnlineSince(null);
      setBookingRequest(null);
      return;
    }
    setOnlineSince((previous) => previous ?? Date.now());
  }, [available]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentCoords) return;
    void updateLocation
      .mutateAsync(currentCoords)
      .catch(() => toast.error("Your location could not be updated"));
    void GetAddressFromCoordinates(currentCoords)
      .then(setAddress)
      .catch(() => setAddress("Current position on the map"));
    // The location hook already suppresses small movements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCoords?.latitude, currentCoords?.longitude]);

  useEffect(() => {
    if (!available || !currentCoords) return;
    // Availability expires after 30 minutes in Redis. A quiet driver may not
    // cross the movement threshold, so refresh the same coarse position every
    // five minutes while online.
    const heartbeat = window.setInterval(() => {
      updateLocation.mutate(currentCoords);
    }, 5 * 60_000);
    return () => window.clearInterval(heartbeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, currentCoords?.latitude, currentCoords?.longitude]);

  const handleAvailability = async (nextAvailable: boolean) => {
    try {
      if (nextAvailable && currentCoords) {
        await updateLocation.mutateAsync(currentCoords);
      }
      await setAvailability.mutateAsync({ available: nextAvailable });
      await availability.refetch();
      toast.success(nextAvailable ? "You’re online" : "You’re offline");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Availability could not be changed",
      );
    }
  };

  const idleMarkers = useMemo<MapMarker[]>(
    () =>
      currentCoords
        ? [
            {
              id: "driver-position",
              ...currentCoords,
              kind: "driver",
              label: available ? "Online here" : "Your location",
            },
          ]
        : [],
    [available, currentCoords],
  );

  const locationError = positionError
    ? "Location unavailable. Check browser permissions."
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#101114] text-slate-100 lg:h-screen">
      {bookingRequest ? (
        <DeliveryMap
          pickup={bookingRequest.booking.pickupAddress}
          dropoff={bookingRequest.booking.deliveryAddress}
          currentLocation={currentCoords}
          className="absolute inset-0 rounded-none"
        />
      ) : (
        <MapboxMap
          markers={idleMarkers}
          showCurrentLocation
          ariaLabel="Driver availability map"
          className="absolute inset-0 rounded-none"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-3 sm:left-6 sm:top-6">
        <BackButton fallbackHref="/dashboard/driver" />
        <div className="bg-[#121318]/92 rounded-2xl border border-white/10 px-4 py-2.5 shadow-xl backdrop-blur-xl">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                available
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.75)]"
                  : "bg-slate-500",
              )}
            />
            {available ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {vehicle && (
        <div className="bg-[#121318]/92 absolute right-4 top-4 z-10 hidden items-center gap-3 rounded-2xl border border-white/10 px-3 py-2.5 shadow-xl backdrop-blur-xl sm:right-6 sm:top-6 sm:flex">
          <img src={vehicle.icon} alt="" className="h-8 w-8" />
          <div>
            <p className="text-xs font-semibold text-white">{vehicle.name}</p>
            <p className="text-[10px] text-slate-500">
              {vehicle.maxWeight} max
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 z-10 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[430px]">
        {availability.isLoading ? (
          <div className="rounded-[1.75rem] border border-white/10 bg-[#15171c]/95 p-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-4 h-24 w-full" />
            <Skeleton className="mt-4 h-12 w-full" />
          </div>
        ) : bookingRequest ? (
          <OfferCard
            request={bookingRequest}
            onDismiss={() => setBookingRequest(null)}
          />
        ) : available ? (
          <OnlineStatusCard
            address={address}
            vehicleName={vehicle?.name ?? "Delivery vehicle"}
            onlineSince={onlineSince}
            now={now}
            locationError={locationError}
            realtimeReady={realtimeReady}
            isChanging={setAvailability.isPending}
            onGoOffline={() => void handleAvailability(false)}
          />
        ) : (
          <OfflineStatusCard
            vehicleName={vehicle?.name ?? "Choose a vehicle"}
            hasLocation={Boolean(currentCoords)}
            locationError={locationError}
            isChanging={setAvailability.isPending}
            onGoOnline={() => void handleAvailability(true)}
          />
        )}
      </div>

      <div className="bg-[#121318]/88 pointer-events-none absolute bottom-6 right-6 z-10 hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[11px] text-slate-400 backdrop-blur lg:flex">
        <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />
        Only your approximate waiting location is shown to customers.
      </div>
    </div>
  );
}
