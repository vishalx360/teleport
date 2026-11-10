import { ArrowRight, Check, Github, MapPin, MessageCircle, PackageCheck } from "lucide-react";
import { Epilogue } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { vehicles } from "@/lib/constants";

import "@/styles/landing.css";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-epilogue",
  display: "swap",
});

const repositoryLink = {
  href: "https://github.com/vishalx360/teleport",
  target: "_blank",
  rel: "noreferrer",
} as const;

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <PackageCheck size={20} aria-hidden="true" />
      </span>
      teleport
    </span>
  );
}

function RouteMap() {
  return (
    <div className="route-map" aria-hidden="true">
      <svg viewBox="0 0 640 380" role="presentation">
        <path className="route-line" d="M72 304 C 150 140, 300 90, 400 196 S 540 266, 568 80" />
        <circle className="route-start" cx="72" cy="304" r="7" />
        <circle className="route-end" cx="568" cy="80" r="7" />
        <text className="route-city" x="72" y="338">Indiranagar</text>
        <text className="route-city" x="568" y="56" textAnchor="end">Koramangala</text>
      </svg>
    </div>
  );
}

function BookingCounter() {
  return (
    <figure
      className="counter well"
      aria-label="Example booking: bike delivery from Indiranagar to Koramangala, fare estimate ₹350"
    >
      <div className="counter-route">
        <p className="label">Delivery route</p>
        <p className="row-name">
          <MapPin size={18} aria-hidden="true" />
          Indiranagar to Koramangala
        </p>
      </div>
      <RouteMap />
      <div className="counter-vehicle">
        <Image
          src="/vehicles/BIKE.svg"
          alt="Bike delivery vehicle"
          width={56}
          height={56}
        />
        <div className="who">
          <p className="row-name">Bike delivery</p>
          <p className="label">Up to 20 kg</p>
        </div>
        <div className="fare">
          <p className="label">Fare estimate</p>
          <p className="figure">₹350</p>
        </div>
      </div>
      <dl className="facts">
        {[
          ["Route", "7 km"],
          ["Vehicle", "Bike"],
          ["Payment", "Secure"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="label">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

const bookingSteps = [
  {
    number: "01",
    title: "Choose your route",
    copy: "Select saved pickup and drop-off addresses, or add a new address from the map.",
  },
  {
    number: "02",
    title: "Pick a vehicle",
    copy: "Compare bike, pickup-truck, and truck capacity with a fare estimate for your route.",
  },
  {
    number: "03",
    title: "Pay and follow",
    copy: "Review the delivery, continue to secure payment, and follow its status through drop-off.",
  },
] as const;

const features = [
  ["Route-aware booking", "Review the route distance and duration before checkout."],
  ["Secure checkout", "Review the fare before continuing to payment."],
  ["Delivery history", "Return to current and completed parcel requests."],
] as const;

function StatusPreview() {
  const steps = ["Booked", "Accepted", "Picked up", "In transit", "Delivered"];

  return (
    <div className="status well">
      <div className="status-head">
        <div>
          <p className="label">Delivery status</p>
          <p className="row-name">Home to Office</p>
        </div>
        <span className="tag tag--on">In transit</span>
      </div>

      <ol className="stages">
        {steps.map((step, index) => {
          const complete = index < 3;
          const active = index === 3;
          return (
            <li
              key={step}
              className={`stage ${active ? "stage-now" : ""} ${index > 3 ? "stage--next" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <div>
                <p className="row-name">{step}</p>
                {active && (
                  <p className="label">Your parcel is on the way to the drop-off.</p>
                )}
              </div>
              {complete && (
                <span className="tag tag--in">
                  <Check size={14} aria-hidden="true" />
                  <span className="visually-hidden">Completed</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="chat">
        <MessageCircle size={20} aria-hidden="true" />
        <div>
          <p className="row-name">Delivery chat</p>
          <p className="label">
            Customer and driver can message from the active booking.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className={`landing ${epilogue.variable}`}>
      <header className="nav">
        <nav
          className="container nav-inner"
          aria-label="Main navigation"
        >
          <Link href="/" aria-label="Teleport home">
            <Brand />
          </Link>
          <div className="nav-links">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#drive">Drive</Link>
          </div>
          <div className="nav-actions">
            <Link {...repositoryLink} className="btn btn--quiet">
              GitHub
            </Link>
            {!process.env.LANDING_ONLY && (
              <Link href="/login" className="btn btn--quiet">
                Sign in
              </Link>
            )}
            <Link {...repositoryLink} className="btn btn--primary hide-sm">
              View repository
            </Link>
          </div>
        </nav>
      </header>

      <section className="hero">
        <div className="container grid hero-grid">
          <div className="hero-copy">
            <h1>Send a parcel across town.</h1>
            <p className="lead">
              Choose the right vehicle, see your fare, pay securely, and follow
              every delivery from pickup to drop-off.
            </p>
            <div className="hero-actions">
              <Link {...repositoryLink} className="btn btn--primary">
                View on GitHub
                <Github size={16} aria-hidden="true" />
              </Link>
              <Link href="#drive" className="btn">
                Drive with Teleport
              </Link>
            </div>
          </div>
          <BookingCounter />
        </div>
      </section>

      <section id="how-it-works">
        <div className="container">
          <div className="grid head">
            <h2>A clear path from pickup to drop-off.</h2>
            <p>
              Teleport keeps each decision in one flow, so you can prepare the
              parcel, choose the right vehicle, and keep up with the delivery.
            </p>
          </div>
          <ol className="steps">
            {bookingSteps.map(({ number, title, copy }) => (
              <li key={number} className="step">
                <span className="figure">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <ul className="features ruled">
            {features.map(([title, copy]) => (
              <li key={title}>
                <p className="row-name">{title}</p>
                <p>{copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="grid head">
            <h2>The right fit for every parcel size.</h2>
            <p>
              Compare capacity and route-based fare estimates before choosing
              how your parcel travels.
            </p>
          </div>
          <ul className="vehicles ruled">
            {vehicles.map((vehicle) => (
              <li key={vehicle.class}>
                <span className="tile">
                  <Image
                    src={vehicle.icon}
                    alt={`${vehicle.name} delivery vehicle`}
                    width={64}
                    height={64}
                  />
                </span>
                <div className="who">
                  <h3>{vehicle.name}</h3>
                  <p>{vehicle.description}</p>
                </div>
                <div className="cap">
                  <p className="label">Capacity</p>
                  <p className="row-name">Up to {vehicle.maxWeight}</p>
                </div>
                <Link
                  {...repositoryLink}
                  aria-label={`View the Teleport ${vehicle.name} implementation on GitHub`}
                  className="icon-link"
                >
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="container grid inform-grid">
          <div className="inform-copy">
            <h2>One delivery, every important update.</h2>
            <p>
              See the delivery’s current stage, return to its history, and
              message the assigned driver from the booking when you need to
              coordinate.
            </p>
            <ul className="checks ruled">
              {[
                "Status from booking through delivery",
                "Customer-driver chat on the active booking",
                "Cancellation while the delivery is still eligible",
              ].map((item) => (
                <li key={item}>
                  <span className="check-mark">
                    <Check size={14} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link {...repositoryLink}>Explore the implementation</Link>
          </div>
          <StatusPreview />
        </div>
      </section>

      <section id="drive">
        <div className="container">
          <div className="well drive-well">
            <div className="grid drive-grid">
              <div className="drive-copy">
                <h2>A focused workspace for every delivery.</h2>
                <p>
                  Set up your driver role and vehicle class, review nearby
                  delivery requests, and move assigned parcels through each
                  delivery stage.
                </p>
                <Link {...repositoryLink} className="btn btn--primary">
                  View the driver flow
                </Link>
              </div>
              <div className="request">
                <div className="request-head">
                  <div>
                    <p className="label">Nearby request</p>
                    <p className="row-name">Indiranagar pickup</p>
                  </div>
                  <span className="tag tag--in">Available</span>
                </div>
                <dl>
                  <div>
                    <dt className="label">Drop-off</dt>
                    <dd>Koramangala</dd>
                  </div>
                  <div>
                    <dt className="label">Vehicle</dt>
                    <dd>Bike</dd>
                  </div>
                </dl>
                <div className="request-note">
                  <p className="row-name">Review before accepting</p>
                  <p className="label">Route and parcel details stay together.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="statement">
        <div className="container grid">
          <h2>See how Teleport is built.</h2>
          <div className="statement-body">
            <p className="lead">
              Explore the complete customer, driver, payment, matching, and
              delivery workflow in the open-source repository.
            </p>
            <Link {...repositoryLink} className="btn btn--primary">
              View GitHub repository
              <Github size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="container foot-inner">
          <Brand />
          <nav className="foot-links" aria-label="Footer navigation">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#drive">Drive</Link>
            <Link {...repositoryLink}>GitHub repository</Link>
          </nav>
          <small>© {new Date().getFullYear()} Teleport</small>
        </div>
      </footer>
    </main>
  );
}
