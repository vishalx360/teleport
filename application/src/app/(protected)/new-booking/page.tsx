"use client";

import { AddressPicker, type AddressType } from "@/components/AddressPicker";
import BackButton from "@/components/BackButton";
import AddressCreationPanel, {
  type SelectedAddressLocation,
} from "@/components/addresses/AddressCreationPanel";
import useAddressMapSelection from "@/components/addresses/useAddressMapSelection";
import MapboxMap, {
  type MapCoordinates,
  type MapMarker,
  type MapRoute,
  type MapViewportBounds,
} from "@/components/maps/MapboxMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import useBookingStore from "@/context/BookingStore";
import { vehicles } from "@/lib/constants";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  Info,
  MapPin,
  Package,
  Route,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const SafetyInfo = ({ compact = false }: { compact?: boolean }) => (
  <Card
    className={compact ? "border-white/10 bg-white/[.03]" : "workspace-panel"}
  >
    <CardHeader className={compact ? "p-4 pb-2" : "flex-row gap-2"}>
      <CardTitle className="text-base font-semibold text-white">
        Before you book
      </CardTitle>
    </CardHeader>
    <CardContent className={compact ? "space-y-2 px-4 pb-4" : "space-y-2"}>
      {(
        [
          [DollarSign, "Avoid sending expensive or fragile items"],
          [Package, "Choose a vehicle that fits your parcel"],
          [AlertTriangle, "No alcohol, illegal, or restricted items"],
          [Clock, "Book before 7 PM to reduce delays"],
        ] as Array<[LucideIcon, string]>
      ).map(([Icon, text]) => (
        <div key={text} className="flex items-center gap-2 text-slate-400">
          <Icon className="h-4 w-4 shrink-0 text-blue-400" />
          <p className="text-xs sm:text-sm">{text}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);

const VehicleSelection = () => {
  const { distance, setselectedVehicle, calculating, selectedVehicle } =
    useBookingStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Choose a vehicle</h3>
        <span className="text-xs text-slate-500">Fare estimate</span>
      </div>
      {vehicles.map((vehicle) => (
        <label key={vehicle.name} className="block cursor-pointer">
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition ${
              selectedVehicle?.name === vehicle.name
                ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400"
                : "border-white/10 bg-white/[.03] hover:border-white/30"
            }`}
            onClick={() => setselectedVehicle(vehicle)}
          >
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="radio"
                name="vehicle"
                value={vehicle.class}
                checked={selectedVehicle?.class === vehicle.class}
                onChange={() => setselectedVehicle(vehicle)}
                className="hidden"
              />
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5">
                <img
                  src={vehicle.icon}
                  alt={vehicle.name}
                  className="h-9 w-9"
                />
              </span>
              <div className="min-w-0">
                <h4 className="font-medium text-white">{vehicle.name}</h4>
                <p className="truncate text-xs text-slate-400">
                  Up to {vehicle.maxWeight} · {vehicle.dimensions}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-right">
              {calculating ? (
                <Skeleton className="h-5 w-14" />
              ) : (
                <div>
                  <p className="font-semibold text-white">
                    ₹{(vehicle.perKmCost * distance).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-slate-500">estimate</p>
                </div>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">{vehicle.name} information</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-2">
                    <h5 className="font-semibold">{vehicle.name} details</h5>
                    <p className="text-sm">Dimensions: {vehicle.dimensions}</p>
                    <p className="text-sm">Weight limit: {vehicle.maxWeight}</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </label>
      ))}
    </div>
  );
};

const EstimatedFare = () => {
  const { distance, selectedVehicle } = useBookingStore();
  if (!selectedVehicle) return null;

  return (
    <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Estimated fare</h3>
          <p className="text-xs text-slate-400">
            {distance} km · taxes calculated at checkout
          </p>
        </div>
        <p className="text-xl font-bold text-blue-300">
          ₹{(selectedVehicle.perKmCost * distance).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

function BookingMap({
  addingAddress,
  selection,
  onSelectLocation,
  onViewportChange,
}: {
  addingAddress: boolean;
  selection: SelectedAddressLocation | null;
  onSelectLocation: (coordinates: {
    latitude: number;
    longitude: number;
  }) => void;
  onViewportChange: (center: MapCoordinates, bounds: MapViewportBounds) => void;
}) {
  const { pickupAddress, deliveryAddress, distance, duration, calculating } =
    useBookingStore();

  const markers = useMemo<MapMarker[]>(() => {
    if (addingAddress) {
      return selection
        ? [
            {
              id: "new-address",
              latitude: selection.latitude,
              longitude: selection.longitude,
              kind: "current",
              label: "New address",
            },
          ]
        : [];
    }
    const next: MapMarker[] = [];
    if (pickupAddress) {
      next.push({
        id: "pickup",
        latitude: pickupAddress.latitude,
        longitude: pickupAddress.longitude,
        kind: "pickup",
        label: `Pickup: ${pickupAddress.nickname}`,
      });
    }
    if (deliveryAddress) {
      next.push({
        id: "dropoff",
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude,
        kind: "dropoff",
        label: `Drop-off: ${deliveryAddress.nickname}`,
      });
    }
    return next;
  }, [addingAddress, deliveryAddress, pickupAddress, selection]);

  const routes = useMemo<MapRoute[]>(
    () =>
      !addingAddress && pickupAddress && deliveryAddress
        ? [
            {
              id: "delivery-route",
              coordinates: [pickupAddress, deliveryAddress],
            },
          ]
        : [],
    [addingAddress, deliveryAddress, pickupAddress],
  );

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-[1.75rem] lg:h-full lg:min-h-0 lg:rounded-none">
      <MapboxMap
        markers={markers}
        routes={routes}
        className="rounded-[1.75rem] lg:rounded-none"
        ariaLabel="New delivery route map"
        fitPadding={96}
        showCurrentLocation
        selectionMode={addingAddress}
        onMapClick={addingAddress ? onSelectLocation : undefined}
        onCurrentLocation={addingAddress ? onSelectLocation : undefined}
        onViewportChange={onViewportChange}
      />
      <div className="pointer-events-none absolute right-5 top-5 rounded-2xl border border-white/10 bg-[#111318]/90 px-4 py-3 shadow-xl backdrop-blur-xl">
        {addingAddress ? (
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <MapPin className="h-4 w-4 text-blue-400" />
            Click the map to place your address
          </div>
        ) : pickupAddress && deliveryAddress ? (
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500 text-white">
              <Route className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                {calculating
                  ? "Calculating route…"
                  : `${distance} km · ${duration} min`}
              </p>
              <p className="max-w-56 truncate text-xs text-slate-400">
                {pickupAddress.nickname} to {deliveryAddress.nickname}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Route className="h-4 w-4 text-blue-400" />
            Select locations to preview the route
          </div>
        )}
      </div>
    </div>
  );
}

function BookingPanel({
  onAddAddress,
}: {
  onAddAddress: (addressType: AddressType) => void;
}) {
  const {
    pickupAddress,
    deliveryAddress,
    selectedVehicle,
    setPickUpAddress,
    setDeliveryAddress,
  } = useBookingStore();
  const routeReady = Boolean(pickupAddress && deliveryAddress);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#15171c]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <BackButton fallbackHref="/dashboard/user" />
          <div className="min-w-0 pt-0.5">
            <p className="eyebrow">Send now</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Book a parcel delivery
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Choose pickup, destination, and the right vehicle.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <AddressPicker
            focused={!pickupAddress}
            address={pickupAddress}
            addressType="pickup"
            disabledAddressId={deliveryAddress?.id}
            updateAddress={setPickUpAddress}
            onAddAddress={onAddAddress}
          />
          <AddressPicker
            focused={Boolean(pickupAddress && !deliveryAddress)}
            address={deliveryAddress}
            addressType="delivery"
            disabledAddressId={pickupAddress?.id}
            updateAddress={setDeliveryAddress}
            onAddAddress={onAddAddress}
          />
        </div>

        {routeReady ? (
          <>
            <VehicleSelection />
            <EstimatedFare />
          </>
        ) : (
          <SafetyInfo compact />
        )}
      </div>

      <div className="border-t border-white/10 bg-[#111318]/95 p-4 sm:p-5">
        <Button
          onClick={() => window.location.assign("/new-booking/checkout")}
          disabled={!routeReady || !selectedVehicle}
          className="h-12 w-full rounded-2xl bg-blue-500 text-base font-bold text-white hover:bg-blue-400"
        >
          Continue to checkout
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          You will review the final price before payment.
        </p>
      </div>
    </div>
  );
}

export default function BookingPage() {
  const resetBooking = useBookingStore((state) => state.resetBooking);
  const setPickUpAddress = useBookingStore((state) => state.setPickUpAddress);
  const setDeliveryAddress = useBookingStore(
    (state) => state.setDeliveryAddress,
  );
  const [addingAddressType, setAddingAddressType] =
    useState<AddressType | null>(null);
  const [mapCenter, setMapCenter] = useState<MapCoordinates | null>(null);
  const [mapBounds, setMapBounds] = useState<MapViewportBounds | null>(null);
  const {
    selection,
    isResolving,
    selectCoordinates,
    selectLocation,
    resetSelection,
  } = useAddressMapSelection();

  useEffect(() => {
    resetBooking();
  }, [resetBooking]);

  const stopAddingAddress = () => {
    resetSelection();
    setAddingAddressType(null);
  };

  return (
    <div className="min-h-screen bg-[#101114] pb-4 lg:h-full lg:min-h-0 lg:pb-0">
      <div className="mx-auto w-[calc(100%-2rem)] pt-4 sm:w-[calc(100%-3rem)] sm:pt-6 lg:h-full lg:w-full lg:pt-0">
        <div className="relative flex flex-col gap-5 rounded-[2rem] lg:block lg:h-full lg:rounded-none">
          <div className="order-2 lg:h-full">
            <BookingMap
              addingAddress={addingAddressType !== null}
              selection={selection}
              onSelectLocation={selectCoordinates}
              onViewportChange={(center, bounds) => {
                setMapCenter(center);
                setMapBounds(bounds);
              }}
            />
          </div>
          <div className="z-10 order-1 lg:absolute lg:inset-y-5 lg:left-5 lg:w-[min(420px,calc(100%-2.5rem))]">
            {addingAddressType ? (
              <AddressCreationPanel
                title={`Add ${addingAddressType === "pickup" ? "pickup" : "drop-off"} address`}
                selection={selection}
                isResolving={isResolving}
                onSelectLocation={selectLocation}
                searchProximity={mapCenter}
                searchBounds={mapBounds}
                onCancel={stopAddingAddress}
                onSaved={(address) => {
                  if (addingAddressType === "pickup") setPickUpAddress(address);
                  else setDeliveryAddress(address);
                  stopAddingAddress();
                }}
              />
            ) : (
              <BookingPanel
                onAddAddress={(addressType) => {
                  resetSelection();
                  setAddingAddressType(addressType);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
