import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Github,
  History,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackagePlus,
  Route,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { vehicles } from "@/lib/constants";

const repositoryLink = {
  href: "https://github.com/vishalx360/teleport",
  target: "_blank",
  rel: "noreferrer",
} as const;

export const dynamic = "force-static";

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/25">
        <PackageCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      teleport
    </span>
  );
}

function DeliveryPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
      <div className="absolute -inset-12 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#17191e] shadow-2xl shadow-black/50">
        <div className="relative h-80 overflow-hidden bg-[#20242b] sm:h-[25rem]">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(35deg,transparent_46%,rgba(255,255,255,.09)_47%,rgba(255,255,255,.09)_49%,transparent_50%),linear-gradient(145deg,transparent_46%,rgba(255,255,255,.06)_47%,rgba(255,255,255,.06)_49%,transparent_50%)] [background-size:120px_90px]" />
          <div className="absolute left-[19%] top-[26%] h-3 w-3 rounded-full bg-blue-400 ring-[7px] ring-blue-400/15" />
          <div className="absolute bottom-[25%] right-[18%] h-3 w-3 rounded-full bg-white ring-[7px] ring-white/10" />
          <div className="absolute left-[22%] top-[29%] h-[46%] w-[58%] -rotate-12 rounded-[50%] border-b-2 border-r-2 border-dashed border-blue-400/80" />

          <div className="absolute left-5 top-5 rounded-2xl border border-white/10 bg-[#111318]/90 px-4 py-3 shadow-xl backdrop-blur-xl sm:left-7 sm:top-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
              Delivery route
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4 text-blue-400" aria-hidden="true" />
              Indiranagar to Koramangala
            </p>
          </div>

          <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[#111318]/95 p-4 shadow-xl backdrop-blur-xl sm:bottom-7 sm:left-7 sm:right-7">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white">
                <Image
                  src="/vehicles/BIKE.svg"
                  alt="Bike delivery vehicle"
                  width={40}
                  height={40}
                />
              </span>
              <div>
                <p className="font-semibold text-white">Bike delivery</p>
                <p className="text-xs text-slate-400">Up to 20 kg</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Fare estimate
              </p>
              <p className="mt-1 text-lg font-bold text-white">₹350</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-[#121419] px-3 py-4 text-center sm:px-6">
          {[
            ["Route", "7 km"],
            ["Vehicle", "Bike"],
            ["Payment", "Secure"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const bookingSteps = [
  {
    number: "01",
    title: "Choose your route",
    copy: "Select saved pickup and drop-off addresses, or add a new address from the map.",
    icon: MapPin,
  },
  {
    number: "02",
    title: "Pick a vehicle",
    copy: "Compare bike, pickup-truck, and truck capacity with a fare estimate for your route.",
    icon: Truck,
  },
  {
    number: "03",
    title: "Pay and follow",
    copy: "Review the delivery, continue to secure payment, and follow its status through drop-off.",
    icon: CreditCard,
  },
] as const;

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-slate-400 sm:text-lg">
        {copy}
      </p>
    </div>
  );
}

function StatusPreview() {
  const steps = ["Booked", "Accepted", "Picked up", "In transit", "Delivered"];

  return (
    <div className="relative rounded-[2rem] border border-white/10 bg-[#15171c] p-5 shadow-2xl shadow-black/30 sm:p-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
            Delivery status
          </p>
          <p className="mt-1 font-semibold text-white">Home to Office</p>
        </div>
        <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300">
          In transit
        </span>
      </div>

      <div className="mt-6 space-y-0">
        {steps.map((step, index) => {
          const complete = index < 4;
          const active = index === 3;
          return (
            <div key={step} className="flex min-h-14 gap-4">
              <div className="flex w-6 flex-col items-center">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    active
                      ? "border-blue-400 bg-blue-500 text-white ring-4 ring-blue-500/15"
                      : complete
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-white/15 bg-[#111318] text-slate-600"
                  }`}
                >
                  {complete && !active ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                {index < steps.length - 1 && (
                  <span
                    className={`h-full w-px ${index < 3 ? "bg-blue-500" : "bg-white/10"}`}
                  />
                )}
              </div>
              <div className="pb-6">
                <p
                  className={`text-sm font-semibold ${complete ? "text-white" : "text-slate-500"}`}
                >
                  {step}
                </p>
                {active && (
                  <p className="mt-1 text-xs text-slate-400">
                    Your parcel is on the way to the drop-off.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Delivery chat</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Customer and driver can message from the active booking.
          </p>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0c0d10] text-white">
      <header className="relative z-20 border-b border-white/10 bg-[#0c0d10]/90 backdrop-blur-xl">
        <nav
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"
          aria-label="Main navigation"
        >
          <Link href="/" aria-label="Teleport home">
            <Brand />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              How it works
            </Link>
            <Link
              href="#drive"
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              Drive
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              {...repositoryLink}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 sm:px-4"
            >
              GitHub
            </Link>
            <Link
              {...repositoryLink}
              className="hidden rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-blue-50 sm:inline-flex"
            >
              View repository
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(59,130,246,.18),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(37,99,235,.10),transparent_28%)]" />
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-300">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Local parcel delivery
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
              Send a parcel across town.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              Choose the right vehicle, see your fare, pay securely, and follow
              every delivery from pickup to drop-off.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                {...repositoryLink}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
              >
                View on GitHub
                <Github className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#drive"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[.04] px-6 font-bold text-white transition hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Drive with Teleport
              </Link>
            </div>
          </div>

          <DeliveryPreview />
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#111318]">
        <div className="mx-auto grid max-w-7xl divide-y divide-white/10 px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            [
              Route,
              "Route-aware booking",
              "Review the route distance and duration before checkout.",
            ],
            [
              CreditCard,
              "Secure checkout",
              "Review the fare before continuing to payment.",
            ],
            [
              History,
              "Delivery history",
              "Return to current and completed parcel requests.",
            ],
          ].map(([Icon, title, copy]) => {
            const ItemIcon = Icon as typeof Route;
            return (
              <div
                key={title as string}
                className="flex gap-4 py-7 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                  <ItemIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-white">{title as string}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {copy as string}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-20 bg-[#0c0d10] py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="A clear path from pickup to drop-off."
            copy="Teleport keeps each decision in one flow, so you can prepare the parcel, choose the right vehicle, and keep up with the delivery."
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {bookingSteps.map(({ number, title, copy, icon: Icon }) => (
              <article
                key={number}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#15171c] p-6 transition hover:-translate-y-1 hover:border-blue-400/30 sm:p-8"
              >
                <span className="absolute right-5 top-3 text-7xl font-bold tracking-tighter text-white/[.035]">
                  {number}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-7 text-xl font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f4f5f7] py-24 text-slate-950 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.65fr]">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Choose your vehicle
              </p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
                The right fit for every parcel size.
              </h2>
            </div>
            <p className="text-base leading-7 text-slate-600 lg:pb-1">
              Compare capacity and route-based fare estimates before choosing
              how your parcel travels.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {vehicles.map((vehicle, index) => (
              <article
                key={vehicle.class}
                className="flex min-h-80 flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-24 w-24 place-items-center rounded-2xl bg-slate-100">
                    <Image
                      src={vehicle.icon}
                      alt={`${vehicle.name} delivery vehicle`}
                      width={80}
                      height={80}
                    />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-7 text-2xl font-semibold tracking-tight">
                  {vehicle.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {vehicle.description}
                </p>
                <div className="mt-auto flex items-end justify-between border-t border-slate-200 pt-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Capacity
                    </p>
                    <p className="mt-1 font-semibold">
                      Up to {vehicle.maxWeight}
                    </p>
                  </div>
                  <Link
                    {...repositoryLink}
                    aria-label={`View the Teleport ${vehicle.name} implementation on GitHub`}
                    className="grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-blue-600"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0c0d10] py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-24">
          <StatusPreview />
          <div>
            <SectionHeading
              eyebrow="Stay informed"
              title="One delivery, every important update."
              copy="See the delivery’s current stage, return to its history, and message the assigned driver from the booking when you need to coordinate."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Status from booking through delivery",
                "Customer-driver chat on the active booking",
                "Cancellation while the delivery is still eligible",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-slate-200"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500/15 text-blue-300">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              {...repositoryLink}
              className="mt-9 inline-flex items-center gap-2 font-bold text-white transition hover:text-blue-300"
            >
              Explore the implementation
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="drive" className="scroll-mt-20 bg-blue-600 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
              Drive with Teleport
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-5xl">
              A focused workspace for every delivery.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">
              Set up your driver role and vehicle class, review nearby delivery
              requests, and move assigned parcels through each delivery stage.
            </p>
            <Link
              {...repositoryLink}
              className="mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              View the driver flow
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-[#0c0d10] p-5 shadow-2xl shadow-blue-950/30 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
                  Nearby request
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Indiranagar pickup
                </p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Available
              </span>
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/[.045] p-4">
                <p className="text-xs text-slate-500">Drop-off</p>
                <p className="mt-1 font-semibold text-white">Koramangala</p>
              </div>
              <div className="rounded-2xl bg-white/[.045] p-4">
                <p className="text-xs text-slate-500">Vehicle</p>
                <p className="mt-1 font-semibold text-white">Bike</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500 text-white">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white">
                  Review before accepting
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Route and parcel details stay together.
                </p>
              </div>
              <ArrowRight
                className="h-4 w-4 text-blue-300"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f5f7] px-5 py-24 text-slate-950 sm:px-8 sm:py-32">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20">
            <PackagePlus className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-7 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            See how Teleport is built.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Explore the complete customer, driver, payment, matching, and
            delivery workflow in the open-source repository.
          </p>
          <Link
            {...repositoryLink}
            className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 font-bold text-white transition hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
          >
            View GitHub repository
            <Github className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0c0d10]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Brand />
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-400"
            aria-label="Footer navigation"
          >
            <Link href="#how-it-works" className="transition hover:text-white">
              How it works
            </Link>
            <Link href="#drive" className="transition hover:text-white">
              Drive
            </Link>
            <Link {...repositoryLink} className="transition hover:text-white">
              GitHub repository
            </Link>
          </nav>
          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} Teleport
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return <LandingPage />;
}
