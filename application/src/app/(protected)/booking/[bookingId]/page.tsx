"use client";

import BookingChat from "@/components/booking/BookingChat";
import BackButton from "@/components/BackButton";
import DeliveryMap from "@/components/maps/DeliveryMap";
import type { MapCoordinates } from "@/components/maps/MapboxMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookingStatus,
  DispatchStatus,
  FulfillmentStatus,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { formattedStatus, vehicleClassMap } from "@/lib/constants";
import {
  getBookingDeadline,
  type BookingDeadline,
} from "@/lib/bookingDeadlines";
import { pusherClient } from "@/lib/pusherClient";
import { cn } from "@/lib/utils";
import { api, type RouterOutputs } from "@/trpc/react";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  Copy,
  Headphones,
  LucideCircleX,
  Mail,
  MapPin,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Route,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Channel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Booking = RouterOutputs["user"]["getBooking"]["booking"];
type Eta = { distance: number | string; duration: number | string };

const journeySteps = [
  { status: BookingStatus.BOOKED, label: "Delivery requested" },
  { status: BookingStatus.ACCEPTED, label: "Driver assigned" },
  { status: BookingStatus.ARRIVED, label: "Driver at pickup" },
  { status: BookingStatus.PICKED_UP, label: "Package picked up" },
  { status: BookingStatus.IN_TRANSIT, label: "On the way" },
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

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function metric(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bookingLabel(booking: Booking) {
  if (booking.dispatchStatus === DispatchStatus.NO_DRIVER_FOUND)
    return "No driver found";
  return formattedStatus[booking.status];
}

function StatusSummary({
  booking,
  eta,
  deadline,
  now,
}: {
  booking: Booking;
  eta?: Eta | null;
  deadline?: BookingDeadline | null;
  now: number;
}) {
  if (
    deadline?.outcome === "ESCALATE" &&
    deadline.deadlineAt.getTime() <= now
  ) {
    return {
      title: `${deadline.label} is overdue`,
      description:
        "The delivery remains active and needs support attention. We will not auto-cancel a parcel after a driver may have taken custody.",
    };
  }
  if (booking.dispatchStatus === DispatchStatus.NO_DRIVER_FOUND) {
    return {
      title: "No driver was available",
      description:
        "Your payment is safe. Search again when you are ready or contact support for help.",
    };
  }

  const driverName = booking.driver?.name ?? "Your driver";
  const etaMinutes = metric(eta?.duration);
  const etaDistance = metric(eta?.distance);
  switch (booking.status) {
    case BookingStatus.BOOKED:
      return {
        title: "Finding a nearby driver",
        description: "We’ll update this page as soon as someone accepts.",
      };
    case BookingStatus.ACCEPTED:
      return {
        title: etaMinutes
          ? `${driverName} arrives in ${Math.round(etaMinutes)} min`
          : `${driverName} is heading to pickup`,
        description: etaDistance
          ? `${etaDistance.toFixed(1)} km from the pickup point.`
          : "Live location will appear as the driver moves.",
      };
    case BookingStatus.ARRIVED:
      return {
        title: `${driverName} has arrived`,
        description: "Meet the driver at the pickup point with your package.",
      };
    case BookingStatus.PICKED_UP:
    case BookingStatus.IN_TRANSIT:
      return {
        title: "Your package is on the way",
        description: etaMinutes
          ? `Estimated arrival in ${Math.round(etaMinutes)} min.`
          : `${driverName} is heading to the drop-off point.`,
      };
    case BookingStatus.DELIVERED:
      return {
        title: "Delivery completed",
        description: `Delivered${booking.driver?.name ? ` by ${booking.driver.name}` : ""}.`,
      };
    case BookingStatus.CANCELLED:
      return {
        title: "Delivery cancelled",
        description:
          booking.cancellationReason ?? "This delivery request was cancelled.",
      };
    case BookingStatus.FAILED:
      return {
        title:
          booking.paymentStatus === PaymentStatus.FAILED
            ? "Payment window expired"
            : "Delivery could not be completed",
        description:
          booking.paymentStatus === PaymentStatus.FAILED
            ? "Payment was not completed within 30 minutes, so this booking was closed before driver matching began."
            : "This booking is closed. Start a new delivery when you’re ready.",
      };
  }
}

function DeadlineNotice({
  deadline,
  now,
  bookingId,
}: {
  deadline: BookingDeadline;
  now: number;
  bookingId: string;
}) {
  const remainingMs = deadline.deadlineAt.getTime() - now;
  const overdue = remainingMs <= 0;
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const remaining = hours ? `${hours}h ${minutes}m` : `${minutes} min`;

  const supportEmail = "support@teleport.vishalx360.dev";
  const emailHref = `mailto:${supportEmail}?subject=${encodeURIComponent(
    `Help with delivery ${bookingId}`,
  )}`;

  return (
    <div
      className={cn(
        "mt-4 grid gap-3 rounded-2xl border p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:pl-4",
        overdue
          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
          : "border-white/10 bg-white/[.035] text-slate-400",
      )}
    >
      <span className="font-medium">{deadline.label}</span>
      {overdue ? (
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 font-semibold text-amber-950 transition hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15171c] sm:w-auto"
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
                This delivery is still active. Include the booking ID below so
                our team can review the driver arrival delay.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Booking ID
              </p>
              <p className="mt-1 break-all text-sm font-medium text-slate-200">
                {bookingId}
              </p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Email
              </p>
              <p className="mt-1 break-all text-sm font-medium text-white">
                {supportEmail}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={emailHref}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                <Mail className="h-4 w-4" />
                Email support
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(supportEmail);
                  toast.success("Support email copied");
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] text-sm font-semibold text-white transition hover:bg-white/[.08]"
              >
                <Copy className="h-4 w-4" />
                Copy email
              </button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <span className="font-semibold">{remaining} remaining</span>
      )}
    </div>
  );
}

function JourneyTimeline({ booking }: { booking: Booking }) {
  const current = statusIndex[booking.status] ?? 0;
  const isClosed =
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.FAILED;

  return (
    <div className="space-y-0">
      {journeySteps.map((step, index) => {
        const complete = !isClosed && index <= current;
        const active = !isClosed && index === current;
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
                    index < current && !isClosed
                      ? "bg-blue-400"
                      : "bg-white/10",
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
      {isClosed && (
        <div className="mt-1 flex items-center gap-3 text-sm font-medium text-rose-300">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500/15">
            <LucideCircleX className="h-4 w-4" />
          </span>
          {booking.status === BookingStatus.CANCELLED ? "Cancelled" : "Failed"}
        </div>
      )}
    </div>
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

export default function BookingDetailsPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const router = useRouter();
  const { bookingId } = params;
  const { data, isLoading, error, isRefetching, refetch } =
    api.user.getBooking.useQuery(bookingId);
  const [latestDriverLocation, setLatestDriverLocation] =
    useState<MapCoordinates | null>(null);
  const [latestEta, setLatestEta] = useState<Eta | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reconciledDeadline = useRef<string | null>(null);

  const cancelBooking = api.user.cancelBooking.useMutation({
    onSuccess: async () => {
      toast.success("Delivery cancelled");
      await refetch();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });
  const retryMatching = api.user.retryMatching.useMutation({
    onSuccess: async () => {
      toast.success("Searching for a driver again");
      await refetch();
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  useEffect(() => {
    const channelName = `private-booking-${bookingId}`;
    const channel: Channel = pusherClient.subscribe(channelName);
    channel.bind("UPDATE", async (event: { message?: string }) => {
      await refetch();
      if (event.message) toast.success(event.message);
    });
    channel.bind("DRIVER_LOCATION", (location: MapCoordinates) => {
      setLatestDriverLocation(location);
    });
    channel.bind("ETA_UPDATE", (nextEta: Eta) => setLatestEta(nextEta));

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(channelName);
    };
  }, [bookingId, refetch]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data?.booking) return;
    const deadline = getBookingDeadline(data.booking);
    if (!deadline || deadline.outcome === "ESCALATE") return;
    const deadlineKey = `${deadline.kind}:${deadline.deadlineAt.toISOString()}`;
    if (reconciledDeadline.current === deadlineKey) return;
    const waitMs = deadline.deadlineAt.getTime() - Date.now();
    if (waitMs <= 0) {
      reconciledDeadline.current = deadlineKey;
      void refetch();
      return;
    }
    const timer = window.setTimeout(() => {
      reconciledDeadline.current = deadlineKey;
      void refetch();
    }, waitMs + 250);
    return () => window.clearTimeout(timer);
  }, [data?.booking, refetch]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen bg-[#101114] lg:h-screen lg:grid-cols-[minmax(0,1fr)_420px]">
        <Skeleton className="m-5 rounded-[1.75rem]" />
        <div className="space-y-4 border-l border-white/10 p-6">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data?.booking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#101114] px-6 text-center">
        <div>
          <PackageOpen className="mx-auto h-8 w-8 text-slate-600" />
          <h1 className="mt-4 text-xl font-semibold text-white">
            Booking unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            We couldn’t load this delivery.
          </p>
          <Link
            href="/activity"
            className="mt-5 inline-flex rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Return to activity
          </Link>
        </div>
      </div>
    );
  }

  const booking = data.booking;
  const driverLocation =
    latestDriverLocation ?? data.lastUpdatedDriverLocation ?? undefined;
  const eta = latestEta ?? data.lastEta;
  const deadline = getBookingDeadline(booking);
  const summary = StatusSummary({ booking, eta, deadline, now });
  const canCancel =
    booking.dispatchStatus === DispatchStatus.SEARCHING &&
    booking.fulfillmentStatus === FulfillmentStatus.NOT_STARTED;
  const canRetry = booking.dispatchStatus === DispatchStatus.NO_DRIVER_FOUND;
  const vehicle = vehicleClassMap[booking.vehicleClass]!;

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="relative min-h-[600px] lg:min-h-0">
        <DeliveryMap
          pickup={booking.pickupAddress}
          dropoff={booking.deliveryAddress}
          driver={driverLocation}
          className="absolute inset-0 rounded-none"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

        <div className="absolute left-4 top-4 z-10 flex items-center gap-3 sm:left-6 sm:top-6">
          <BackButton fallbackHref="/activity" />
          <div className="rounded-2xl border border-white/10 bg-[#121318]/90 px-4 py-2.5 shadow-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Delivery
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
                {bookingLabel(booking)}
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
            {deadline && (
              <DeadlineNotice
                deadline={deadline}
                now={now}
                bookingId={booking.id}
              />
            )}

            {booking.driver && (
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-500/15 text-blue-300">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {booking.driver.name ?? "Delivery partner"}
                    </p>
                    <p className="text-xs text-slate-500">Your driver</p>
                  </div>
                </div>
                <BookingChat
                  bookingId={booking.id}
                  participantName={booking.driver.name ?? "Your driver"}
                  label="Message driver"
                  variant="icon"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="border-t border-white/10 bg-[#15161a] lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div className="p-5 sm:p-6 lg:p-7">
          <p className="eyebrow">Booking details</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Your delivery
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                ID {booking.id.slice(-10).toUpperCase()}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider",
                booking.paymentStatus === PaymentStatus.PAID
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-blue-500/10 text-blue-300",
              )}
            >
              {booking.paymentStatus.toLowerCase().replaceAll("_", " ")}
            </span>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5">
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
          </div>

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
                <p className="text-xs text-slate-500">Delivery vehicle</p>
              </div>
            </div>
            <div className="mt-3 divide-y divide-white/10">
              <DetailRow
                label="Booked"
                value={dateTime.format(new Date(booking.createdAt))}
              />
              <DetailRow
                label="Distance"
                value={`${(booking.distanceMeters / 1_000).toFixed(1)} km`}
              />
              <DetailRow
                label="Estimated time"
                value={`${Math.max(1, Math.round(booking.durationSeconds / 60))} min`}
              />
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-blue-400" />
              <h3 className="font-semibold text-white">Payment summary</h3>
            </div>
            <div className="mt-3 divide-y divide-white/10">
              <DetailRow
                label="Delivery fare"
                value={money(booking.subtotalAmount, booking.currency)}
              />
              {booking.discountAmount > 0 && (
                <DetailRow
                  label="Discount"
                  value={`−${money(booking.discountAmount, booking.currency)}`}
                />
              )}
              <DetailRow
                label="Total"
                value={money(booking.totalAmount, booking.currency)}
              />
            </div>
          </section>

          <div className="mt-6 space-y-3">
            {canRetry && (
              <button
                type="button"
                disabled={retryMatching.isPending}
                onClick={() =>
                  retryMatching.mutate({
                    bookingId: booking.id,
                    commandId: crypto.randomUUID(),
                  })
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    retryMatching.isPending && "animate-spin",
                  )}
                />
                {retryMatching.isPending ? "Searching…" : "Find another driver"}
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                disabled={cancelBooking.isPending}
                onClick={() => {
                  if (!window.confirm("Cancel this delivery request?")) return;
                  cancelBooking.mutate({
                    bookingId: booking.id,
                    commandId: crypto.randomUUID(),
                    reason: "Cancelled by customer",
                  });
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/5 font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
              >
                <LucideCircleX className="h-4 w-4" />
                {cancelBooking.isPending ? "Cancelling…" : "Cancel delivery"}
              </button>
            )}

            {(booking.status === BookingStatus.DELIVERED ||
              booking.status === BookingStatus.CANCELLED ||
              booking.status === BookingStatus.FAILED) && (
              <Link
                href="/new-booking"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 font-semibold text-white transition hover:bg-blue-400"
              >
                Book another delivery
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            <Link
              href="/activity"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-slate-400 transition hover:bg-white/[.04] hover:text-white"
            >
              <Route className="h-4 w-4" />
              View all activity
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
