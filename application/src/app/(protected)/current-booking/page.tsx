"use client";

import BookingChat from "@/components/booking/BookingChat";
import BackButton from "@/components/BackButton";
import DeliveryMap from "@/components/maps/DeliveryMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatus } from "@/generated/prisma/enums";
import useActiveLocation from "@/hooks/useActiveLocation";
import { getBookingDeadline } from "@/lib/bookingDeadlines";
import { formattedStatus, vehicleClassMap } from "@/lib/constants";
import { pusherClient } from "@/lib/pusherClient";
import { cn } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";
import {
  Check,
  Clock3,
  ExternalLink,
  Headphones,
  LocateFixed,
  Mail,
  MapPin,
  Navigation,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Channel } from "pusher-js";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type CurrentBookingData = NonNullable<
  RouterOutputs["driver"]["getCurrentBooking"]
>;
type DriverBooking = CurrentBookingData["booking"];
type Eta = { distance: number | string; duration: number | string };
type NextStatus = "ARRIVED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED";

const journeySteps = [
  { status: BookingStatus.BOOKED, label: "Delivery requested" },
  { status: BookingStatus.ACCEPTED, label: "Drive to pickup" },
  { status: BookingStatus.ARRIVED, label: "Arrived at pickup" },
  { status: BookingStatus.PICKED_UP, label: "Package collected" },
  { status: BookingStatus.IN_TRANSIT, label: "Drive to drop-off" },
  { status: BookingStatus.DELIVERED, label: "Delivered" },
] as const;

const statusIndex: Partial<Record<BookingStatus, number>> = {
  [BookingStatus.BOOKED]: 0,
  [BookingStatus.ACCEPTED]: 1,
  [BookingStatus.ARRIVED]: 2,
  [BookingStatus.PICKED_UP]: 3,
  [BookingStatus.IN_TRANSIT]: 4,
  [BookingStatus.DELIVERED]: 5,
};

const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function metric(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusSummary(booking: DriverBooking, eta?: Eta | null) {
  const minutes = metric(eta?.duration);
  const distance = metric(eta?.distance);
  switch (booking.status) {
    case BookingStatus.ACCEPTED:
      return {
        title: minutes
          ? `${Math.round(minutes)} min to pickup`
          : "Head to pickup",
        description: distance
          ? `${distance.toFixed(1)} km to ${booking.pickupAddress.nickname}.`
          : "Follow the route to the customer’s pickup point.",
      };
    case BookingStatus.ARRIVED:
      return {
        title: "You’re at the pickup",
        description: "Meet the customer and confirm the package handoff.",
      };
    case BookingStatus.PICKED_UP:
      return {
        title: "Package collected",
        description: "Confirm when you are ready to begin the delivery route.",
      };
    case BookingStatus.IN_TRANSIT:
      return {
        title: minutes
          ? `${Math.round(minutes)} min to drop-off`
          : "Head to drop-off",
        description: distance
          ? `${distance.toFixed(1)} km to ${booking.deliveryAddress.nickname}.`
          : "Follow the route to the recipient.",
      };
    default:
      return {
        title: formattedStatus[booking.status],
        description: "Review this delivery’s latest status.",
      };
  }
}

function JourneyTimeline({ booking }: { booking: DriverBooking }) {
  const current = statusIndex[booking.status] ?? 0;
  return (
    <div className="space-y-0">
      {journeySteps.map((step, index) => {
        const complete = index <= current;
        const active = index === current;
        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex w-6 flex-col items-center">
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-white",
                  complete
                    ? "border-blue-400 bg-blue-500"
                    : "border-white/15 bg-[#1f2127]",
                  active && "ring-4 ring-blue-500/15",
                )}
              >
                {complete && <Check className="h-3.5 w-3.5" />}
              </span>
              {index < journeySteps.length - 1 && (
                <span
                  className={cn(
                    "h-8 w-px",
                    index < current ? "bg-blue-400" : "bg-white/10",
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "pt-0.5 text-sm",
                complete ? "font-medium text-white" : "text-slate-600",
              )}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SupportDialog() {
  const supportEmail = "support@teleport.vishalx360.dev";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-semibold text-amber-950 transition hover:bg-amber-200 sm:w-auto"
        >
          <Headphones className="h-4 w-4" />
          Contact support
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl border-white/10 bg-[#181a1f] p-6 text-slate-100 shadow-2xl">
        <DialogHeader className="text-left">
          <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
            <Headphones className="h-5 w-5" />
          </span>
          <DialogTitle className="text-xl text-white">
            Contact Teleport support
          </DialogTitle>
          <DialogDescription className="pt-1 leading-6 text-slate-400">
            Tell our team what is blocking this delivery and include the booking
            ID shown in the details panel.
          </DialogDescription>
        </DialogHeader>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent("Help with an active Teleport delivery")}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          <Mail className="h-4 w-4" />
          {supportEmail}
        </a>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-200">{value}</span>
    </div>
  );
}

function nextAction(booking: DriverBooking) {
  const actions: Partial<
    Record<BookingStatus, { label: string; status: NextStatus; gated: boolean }>
  > = {
    [BookingStatus.ACCEPTED]: {
      label: "I have arrived",
      status: "ARRIVED",
      gated: true,
    },
    [BookingStatus.ARRIVED]: {
      label: "Package picked up",
      status: "PICKED_UP",
      gated: false,
    },
    [BookingStatus.PICKED_UP]: {
      label: "Start delivery",
      status: "IN_TRANSIT",
      gated: false,
    },
    [BookingStatus.IN_TRANSIT]: {
      label: "Mark delivered",
      status: "DELIVERED",
      gated: true,
    },
  };
  return actions[booking.status] ?? null;
}

export default function CurrentBookingPage() {
  const router = useRouter();
  const { data, isLoading, error, isRefetching, refetch } =
    api.driver.getCurrentBooking.useQuery();
  const updateLocation = api.driver.updateLocation.useMutation();
  const advanceBooking = api.driver.advanceBooking.useMutation({
    onSuccess: async () => {
      toast.success("Delivery updated");
      await refetch();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });
  const [latestEta, setLatestEta] = useState<Eta | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const eta = latestEta ?? data?.lastEta;
  const distance = metric(eta?.distance);
  const {
    currentCoords,
    positionError,
    isGeolocationAvailable,
    isGeolocationEnabled,
  } = useActiveLocation({
    updateInterval: 10,
    distanceThreshold: distance != null && distance < 0.5 ? 50 : 300,
  });
  const driverLocation = currentCoords ?? data?.lastUpdatedDriverLocation;
  const bookingId = data?.booking.id;

  useEffect(() => {
    if (!bookingId) return;
    const channelName = `private-booking-${bookingId}`;
    const channel: Channel = pusherClient.subscribe(channelName);
    const handleUpdate = async (event: { message?: string }) => {
      await refetch();
      if (event.message) toast.success(event.message);
    };
    const handleEta = (nextEta: Eta) => setLatestEta(nextEta);
    channel.bind("UPDATE", handleUpdate);
    channel.bind("ETA_UPDATE", handleEta);
    return () => {
      channel.unbind("UPDATE", handleUpdate);
      channel.unbind("ETA_UPDATE", handleEta);
      pusherClient.unsubscribe(channelName);
    };
  }, [bookingId, refetch]);

  useEffect(() => {
    if (!currentCoords) return;
    updateLocation.mutate({
      ...currentCoords,
      bookingId,
    });
    // The location hook already suppresses movements below the threshold.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCoords?.latitude, currentCoords?.longitude, bookingId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="grid min-h-screen bg-[#101114] lg:h-screen lg:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="m-5 rounded-[1.75rem]" />
        <div className="space-y-4 border-l border-white/10 p-6">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Active delivery unavailable"
        description="We couldn’t load your current route. Check your connection and try again."
        actionLabel="Try again"
        onAction={() => void refetch()}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No active delivery"
        description="Accepted deliveries will appear here with their route and next action."
        href="/accept-bookings"
        actionLabel="View delivery offers"
      />
    );
  }

  const booking = data.booking;
  const summary = statusSummary(booking, eta);
  const deadline = getBookingDeadline(booking);
  const overdue = Boolean(
    deadline?.outcome === "ESCALATE" && deadline.deadlineAt.getTime() <= now,
  );
  const action = nextAction(booking);
  const proximityBlocked = Boolean(
    action?.gated && (distance == null || distance > 0.2),
  );
  const locationUnavailable =
    !isGeolocationAvailable || !isGeolocationEnabled || Boolean(positionError);
  const actionBlocked = proximityBlocked || advanceBooking.isPending;
  const destination =
    booking.status === BookingStatus.ACCEPTED ||
    booking.status === BookingStatus.ARRIVED
      ? booking.pickupAddress
      : booking.deliveryAddress;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
  const vehicle = vehicleClassMap[booking.vehicleClass]!;

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="relative min-h-[620px] lg:min-h-0">
        <DeliveryMap
          pickup={booking.pickupAddress}
          dropoff={booking.deliveryAddress}
          currentLocation={driverLocation}
          className="absolute inset-0 rounded-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

        <div className="absolute left-4 top-4 z-10 flex items-center gap-3 sm:left-6 sm:top-6">
          <BackButton fallbackHref="/dashboard/driver" />
          <div className="rounded-2xl border border-white/10 bg-[#121318]/90 px-4 py-2.5 shadow-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Active delivery
            </p>
            <p className="mt-0.5 max-w-[55vw] truncate text-sm font-semibold text-white">
              {booking.pickupAddress.nickname} to{" "}
              {booking.deliveryAddress.nickname}
            </p>
          </div>
        </div>

        <div className="absolute bottom-5 left-4 right-4 z-10 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[min(520px,calc(100%-3rem))]">
          <div className="rounded-[1.6rem] border border-white/10 bg-[#15171c]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
                {formattedStatus[booking.status]}
              </span>
              <button
                type="button"
                aria-label="Refresh delivery"
                onClick={() => void refetch()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 transition hover:bg-white/[.08]"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isRefetching && "animate-spin")}
                />
              </button>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {summary.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {summary.description}
            </p>

            {overdue && deadline && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:pl-4">
                <span className="font-medium">{deadline.label} is overdue</span>
                <SupportDialog />
              </div>
            )}

            {locationUnavailable && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs leading-5 text-rose-200">
                <LocateFixed className="mt-0.5 h-4 w-4 shrink-0" />
                Enable location access to share progress and complete
                proximity-checked steps.
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-500/15 text-blue-300">
                  <UserRound className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {booking.user.name ?? booking.pickupAddress.contactName}
                  </p>
                  <p className="text-xs text-slate-500">Customer</p>
                </div>
              </div>
              <BookingChat
                bookingId={booking.id}
                participantName={booking.user.name ?? "Customer"}
                label="Message customer"
                variant="icon"
              />
            </div>
          </div>
        </div>
      </section>

      <aside className="border-t border-white/10 bg-[#15161a] lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div className="p-5 sm:p-6 lg:p-7">
          <p className="eyebrow">Driver workspace</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Route details
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                ID {booking.id.slice(-10).toUpperCase()}
              </p>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-400"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </a>
          </div>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/15 text-blue-300">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">
                  {booking.pickupAddress.contactName}
                </p>
                <p className="text-xs text-slate-500">Pickup contact</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={`tel:${booking.pickupAddress.mobile}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-semibold text-white transition hover:bg-white/[.08]"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
              <BookingChat
                bookingId={booking.id}
                participantName={booking.user.name ?? "Customer"}
                label="Message"
              />
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Pickup
                </p>
                <p className="mt-1 font-semibold text-white">
                  {booking.pickupAddress.nickname}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  {booking.pickupAddress.address}
                </p>
              </div>
            </div>
            <div className="ml-[17px] h-7 border-l border-dashed border-white/20" />
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[.06] text-white">
                <PackageCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Drop-off
                </p>
                <p className="mt-1 font-semibold text-white">
                  {booking.deliveryAddress.nickname}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  {booking.deliveryAddress.address}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 border-t border-white/10 pt-6">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-blue-400" />
              <h3 className="font-semibold text-white">Delivery progress</h3>
            </div>
            <JourneyTimeline booking={booking} />
          </section>

          <section className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[.05]">
                <img src={vehicle.icon} alt="" className="h-8 w-8" />
              </span>
              <div>
                <p className="font-semibold text-white">{vehicle.name}</p>
                <p className="text-xs text-slate-500">Assigned vehicle</p>
              </div>
            </div>
            <div className="mt-3 divide-y divide-white/10">
              <DetailRow
                label="Booked"
                value={dateTime.format(new Date(booking.createdAt))}
              />
              <DetailRow
                label="Route distance"
                value={`${(booking.distanceMeters / 1_000).toFixed(1)} km`}
              />
              <DetailRow
                label="Estimated time"
                value={`${Math.max(1, Math.round(booking.durationSeconds / 60))} min`}
              />
            </div>
          </section>

          <section className="-mx-5 mt-6 border-t border-white/10 bg-[#15161a]/95 px-5 pb-1 pt-5 backdrop-blur sm:-mx-6 sm:px-6 lg:sticky lg:bottom-0 lg:-mx-7 lg:px-7">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-semibold text-white transition hover:bg-white/[.08]"
            >
              <ExternalLink className="h-4 w-4" />
              Open directions to {destination.nickname}
            </a>
            {action && (
              <>
                <button
                  type="button"
                  disabled={actionBlocked}
                  onClick={() =>
                    advanceBooking.mutate({
                      bookingId: booking.id,
                      commandId: crypto.randomUUID(),
                      toStatus: action.status,
                    })
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {advanceBooking.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {advanceBooking.isPending ? "Updating…" : action.label}
                </button>
                {proximityBlocked && (
                  <p className="mt-2 text-center text-xs leading-5 text-slate-500">
                    {distance == null
                      ? "Waiting for your location before this step can be completed."
                      : `Move within 200 m of ${destination.nickname}. You are ${distance.toFixed(1)} km away.`}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  href,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#101114] px-6 text-center text-slate-100">
      <div className="max-w-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
          <PackageOpen className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        {href ? (
          <Link
            href={href}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-blue-500 px-5 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
