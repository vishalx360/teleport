# Teleport Product Specification

## 1. Product Definition

Teleport is an on-demand, local parcel-delivery marketplace similar to Porter, Delhivery Direct, and Uber Parcel. A customer requests a point-to-point delivery, pays, and tracks it in real time. A nearby verified driver can accept the job, collect the parcel, and complete delivery with proof.

This document defines the intended product experience, independent of the current implementation. It is the source of truth for subsequent UX and engineering work.

### Product principles

- Show one clear primary action per screen.
- Treat payment, driver matching, and delivery as separate states.
- Never imply that a successful payment failed because matching failed.
- Show only actions valid for the user’s role and the booking’s current state.
- Make every critical state recoverable: retry matching, contact support, cancel, or request a refund when eligible.
- Use a map-first, mobile-first experience that expands efficiently on desktop.

### Capability labels

- **Launch:** required for a complete initial product.
- **Later:** valuable, but not required for the first production release.
- **Not allowed:** an action that must be blocked by product rules.

## 2. Roles and Navigation

### Customer app

Primary navigation: **Home**, **Deliveries**, **Addresses**, **Notifications**, and **Account**. On mobile, use a bottom bar with a prominent **New delivery** action. On desktop, use a left rail and allow the map and booking panel to share the full viewport.

### Driver app

Primary navigation: **Home**, **Jobs**, **Earnings**, **Notifications**, and **Account**. Availability must remain visible from Home and persist across navigation.

### Shared roles

Support and operations users are out of scope for the consumer navigation, but a production launch requires an internal operations console for booking lookup, refunds, driver review, and incident handling.

## 3. Shared State Model

### Payment states

`NOT_STARTED → PROCESSING → PAID → REFUND_PENDING → REFUNDED`

Payment can also move from `PROCESSING` to `PAYMENT_FAILED`. A failed payment does not create an active delivery request. A paid booking always displays **Paid**, even if no driver is found later.

### Delivery states

`DRAFT → SEARCHING → DRIVER_ASSIGNED → DRIVER_ARRIVING → AT_PICKUP → PICKED_UP → IN_TRANSIT → DELIVERED`

Terminal alternatives are `CANCELLED` and `NO_DRIVER_FOUND`. “Failed” must not be used as a generic customer-facing status.

### Allowed customer actions by delivery state

| State                      | What is shown                                  | Customer actions                                    |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Draft                      | Route, parcel, vehicle, quote                  | Edit, discard, continue to payment                  |
| Searching                  | Paid badge, search animation, expected wait    | Cancel, contact support                             |
| No driver found            | Payment remains Paid; refund/retry explanation | Search again, change vehicle, request refund        |
| Driver assigned / arriving | Driver, vehicle, ETA, live location            | Message/call, share tracking, cancel subject to fee |
| At pickup                  | Driver and pickup verification                 | Message/call, provide pickup PIN                    |
| Picked up / in transit     | Live route, ETA, safety details                | Message/call, share tracking, contact support       |
| Delivered                  | Proof, receipt, final timeline                 | Rate, tip, report issue, download receipt           |
| Cancelled                  | Reason, charge/refund status                   | Rebook, view receipt, contact support               |

Cancellation is **not allowed** after pickup. Cancel and retry controls are never shown for terminal deliveries unless they represent a valid new action such as **Rebook**.

## 4. Customer Screens

### 4.1 Sign in and onboarding

Show phone/email sign-in, OTP or secure authentication, terms, and role selection when an account is new. Ask for notification and location permissions with a clear reason and allow manual address entry when location is denied.

**Launch actions:** sign in, sign out, select customer role, grant/skip permissions.  
**Later:** social sign-in, business SSO, household accounts.

### 4.2 Customer Home

The map fills the available space and centers on the current location. A persistent **Send a package** card contains pickup and drop-off fields. Below or beside it, show saved addresses, recent deliveries, and an active-delivery card when applicable.

**Launch actions:**

- Use current location or select a point on the map.
- Choose a saved pickup/drop-off address.
- Start a new delivery.
- Open the active delivery.
- Repeat a recent route.
- Add or edit a saved address.

**Later:** scheduled deliveries, multiple stops, promotional banners, business account switcher, price estimates before destination selection.

### 4.3 New Delivery — Route

Show pickup and destination fields, map pins, route line, distance, and estimated duration. Address search results must include enough detail to disambiguate similarly named places.

**Launch actions:** use current location, search, move map pin, swap addresses, select saved address, confirm route.  
**Not allowed:** continue when both addresses are the same, outside the service area, or incomplete.

### 4.4 New Delivery — Parcel and Recipient

Collect parcel category, description, approximate weight/size, handling notes, declared value, recipient name, and recipient phone. Clearly list prohibited items.

**Launch actions:** choose parcel category, enter recipient details, add delivery instructions, accept prohibited-item policy.  
**Later:** parcel photos, insurance, saved recipients, barcode scanning.

### 4.5 New Delivery — Vehicle and Quote

Present only eligible vehicle types based on route and parcel details. Each option shows capacity, ETA, and an itemized price. The selected option is visually clear.

**Launch actions:** compare vehicles, select a vehicle, review fare breakdown, continue.  
**Later:** priority delivery, pooled delivery, coupons, negotiated business pricing.

### 4.6 Review and Payment

Show the complete route, parcel, recipient, vehicle, fare, cancellation policy, and selected payment method before payment. During provider redirect, show a durable processing state and prevent duplicate submissions.

**Launch actions:** edit any section, pay securely, retry a failed payment, abandon checkout.  
**Later:** saved cards, wallets, cash, credits, invoices, split payment.

### 4.7 Searching for a Driver

Confirm **Payment successful** separately from **Finding a driver**. Show a search animation, search area, elapsed time, and expected next step. If no driver is found, explain that the delivery could not be matched—not that payment failed.

**Launch actions:** cancel while searching, retry matching, choose another eligible vehicle, request refund, contact support.  
**Not allowed:** create two simultaneous match attempts for the same booking or charge again when retrying.

### 4.8 Active Delivery Details

Use a full map with the driver’s live location and route. The details panel shows delivery status, ETA, driver photo/name/rating, verified vehicle, pickup and recipient details, payment status, safety controls, and a chronological timeline.

**Launch actions:** refresh, message/call through protected contact, share tracking link, copy booking ID, contact support, cancel only when permitted.  
**Later:** live chat attachments, add a stop before pickup, tip during delivery.

### 4.9 Delivery Completion

Show delivery time, proof of delivery, recipient confirmation, final price, payment receipt, and issue-reporting window.

**Launch actions:** rate driver, report damaged/missing parcel, download receipt, rebook route.  
**Later:** tip, favorite driver where legally appropriate, carbon estimate.

### 4.10 Deliveries

List active and historical deliveries with status, route, date, and price. Provide filters for active, completed, cancelled, and refunded.

**Launch actions:** search by booking ID/address, filter, open details, rebook completed route.  
**Later:** CSV export, business cost centers, bulk booking.

### 4.11 Saved Addresses

Show Home, Work, and custom entries with contact details and map previews.

**Launch actions:** add, edit, delete, set default, validate map pin.  
**Not allowed:** delete an address referenced by an active delivery; it may be archived instead.

### 4.12 Notifications

Group notifications by delivery and distinguish unread items. Critical updates include driver assigned, driver arrived, parcel picked up, delivered, cancelled, refund updates, and payment issues.

**Launch actions:** open related delivery, mark read, configure notification preferences.  
**Later:** quiet hours and channel-level preferences.

### 4.13 Customer Account and Support

Show profile, verified contact details, payment preferences, saved addresses, security, legal documents, and support.

**Launch actions:** edit profile, manage notification permissions, view terms/privacy, contact support, sign out, request account deletion.  
**Later:** business profile, tax details, referral program, subscription plan.

## 5. Driver Screens

### 5.1 Driver onboarding and verification

Collect identity, driver’s license, vehicle type/details, registration, insurance, payout account, service area, and required consent. Show verification progress and precise rejection reasons.

**Launch actions:** submit documents, save progress, resubmit rejected items, contact support.  
**Not allowed:** go online until identity and vehicle are approved.  
**Later:** automated document extraction and background-check integrations.

### 5.2 Driver Home

The map fills the viewport and shows the driver location, service zone, and demand areas. A prominent **Go online / Go offline** control reflects the authoritative availability state. The screen also shows today’s earnings, completed jobs, active incentives, and the current vehicle.

**Launch actions:**

- Go online or offline.
- Update live location while online.
- Open the current job.
- Edit or switch an approved vehicle while offline.
- View today’s earnings and recent jobs.
- Open navigation and support.

**Not allowed:** go offline during an active delivery, accept work with an unapproved vehicle, or switch vehicle during an active job.  
**Later:** demand heatmaps, destination preferences, break scheduling, fuel/charging insights.

### 5.3 Incoming Delivery Offer

Display as a time-limited, prominent offer with pickup distance/ETA, pickup area, drop-off area, trip distance, parcel category, required vehicle, estimated earnings, and timer. Do not expose unnecessary customer personal information before acceptance.

**Launch actions:** accept or decline.  
**Not allowed:** accept after expiry, accept multiple active jobs, or accept while offline.  
**Later:** stacked deliveries and reason-based decline analytics.

### 5.4 Drive to Pickup

Show navigation, pickup ETA, customer contact, parcel summary, parking/handling notes, and safety controls.

**Launch actions:** open turn-by-turn navigation, call/message customer, report delay, mark arrived when geographically eligible, cancel with a required reason.  
**Later:** in-app voice navigation and automated customer ETA alerts.

### 5.5 Pickup Verification

Show recipient/sender name, parcel expectations, handling notes, and pickup checklist. Require proof that the correct parcel was collected.

**Launch actions:** enter pickup PIN or scan code, confirm parcel condition, report mismatch/prohibited item, mark picked up.  
**Not allowed:** mark picked up before arrival and verification.  
**Later:** parcel dimension/photo verification and digital signature.

### 5.6 In-Transit Delivery

Show destination navigation, live ETA, recipient contact, delivery instructions, and incident controls. Location sharing remains active while the job is in progress.

**Launch actions:** navigate, call/message recipient, report delay/incident, reach support, mark arrived at drop-off.  
**Not allowed:** cancel normally after pickup; the driver must use an incident/support flow.

### 5.7 Drop-off and Proof of Delivery

Require delivery confirmation appropriate to the order: recipient PIN, signature, or proof photo. Show the exact recipient and instructions.

**Launch actions:** verify recipient, capture proof, mark delivered, report recipient unavailable.  
**Not allowed:** complete without required proof or outside the destination geofence without an approved override.  
**Later:** age/identity verification and return-to-sender automation.

### 5.8 Driver Jobs

Separate active, offered, completed, cancelled, and disputed work. Each item shows route, time, outcome, and earnings.

**Launch actions:** filter, search, open job details, contact support for an eligible job.  
**Later:** downloadable statements and performance insights.

### 5.9 Earnings and Payouts

Show available balance, pending earnings, adjustments, tips, fees, and payout history with a transparent per-job breakdown.

**Launch actions:** view breakdown, manage payout account, request payout where supported, report discrepancy.  
**Later:** instant payouts, tax documents, earnings goals.

### 5.10 Vehicle Management

Show all registered vehicles and each verification state. One approved vehicle can be active at a time.

**Launch actions:** add/edit vehicle, upload documents, choose active vehicle while offline, remove an inactive vehicle.  
**Not allowed:** edit identifying details of an approved vehicle without re-verification.  
**Later:** fleet-owner accounts and multiple drivers per vehicle.

### 5.11 Driver Notifications, Account, and Support

Show job updates, document expiry warnings, payout updates, policy notices, profile, safety resources, permissions, and support cases.

**Launch actions:** manage profile and permissions, review verification, contact emergency/support services, view policies, sign out while offline.  
**Later:** training center, achievements, driver community, preferred support language.

## 6. Notifications and Real-Time Behavior

The database is the source of truth. Real-time events prompt the UI to refetch authoritative state; they do not independently change a booking. Each event must be idempotent and tied to a booking ID and event timestamp.

Customer notifications are required for payment confirmation/failure, matching outcome, driver arrival, pickup, delivery, cancellation, refund, and incidents. Driver notifications are required for offers, offer expiry, customer cancellation, destination changes before pickup, payout, and document expiry.

If connectivity is lost, show **Reconnecting** and the last update time. Restore the correct screen from server state after reload or reconnection.

## 7. Safety, Privacy, and Accessibility

- Mask phone numbers and minimize personal information before driver acceptance.
- Limit live-location collection to availability and active-delivery periods.
- Provide emergency assistance, incident reporting, and auditable status history.
- Confirm destructive actions and always explain cancellation fees or refund timing first.
- Meet WCAG 2.2 AA contrast, keyboard, focus, screen-reader, and motion requirements.
- Keep status meaning independent of color and provide both light and dark map-compatible themes.

## 8. Launch Boundary

The Launch scope delivers a reliable single-pickup, single-drop, on-demand parcel flow with online driver matching, Stripe payment, live tracking, verified pickup/drop-off, receipts, refunds, notifications, and support escalation.

Multi-stop routes, scheduled delivery, cash, batching, fleet accounts, advanced promotions, and automated returns remain Later capabilities. They should not complicate the initial booking or delivery state model.

## 9. Acceptance Standard for Every Screen

Every implementation must define loading, empty, success, recoverable error, terminal, offline, and permission-denied states. Actions must be authorized on the server, idempotent where repeat submission is possible, and immediately disabled after invocation. Mobile layouts must remain usable at 320 px width; desktop layouts should use the viewport without stretching reading-width content excessively.
