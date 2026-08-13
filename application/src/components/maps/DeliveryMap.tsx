"use client";

import MapboxMap, {
  type MapCoordinates,
  type MapMarker,
} from "@/components/maps/MapboxMap";
import { useMemo } from "react";

type DeliveryMapProps = {
  pickup: MapCoordinates;
  dropoff: MapCoordinates;
  driver?: MapCoordinates | null;
  currentLocation?: MapCoordinates | null;
  className?: string;
  includeDriverInBounds?: boolean;
};

export default function DeliveryMap({
  pickup,
  dropoff,
  driver,
  currentLocation,
  className,
  includeDriverInBounds = true,
}: DeliveryMapProps) {
  const markers = useMemo<MapMarker[]>(() => {
    const nextMarkers: MapMarker[] = [
      { id: "pickup", ...pickup, kind: "pickup", label: "Pickup" },
      { id: "dropoff", ...dropoff, kind: "dropoff", label: "Drop-off" },
    ];

    if (driver) {
      nextMarkers.push({
        id: "driver",
        ...driver,
        kind: "driver",
        label: "Driver",
        includeInBounds: includeDriverInBounds,
      });
    }

    if (currentLocation) {
      nextMarkers.push({
        id: "current-location",
        ...currentLocation,
        kind: "current",
        label: "Your location",
      });
    }

    return nextMarkers;
  }, [currentLocation, driver, dropoff, includeDriverInBounds, pickup]);

  const routes = useMemo(
    () => [{ id: "delivery-route", coordinates: [pickup, dropoff] }],
    [dropoff, pickup],
  );

  return (
    <MapboxMap
      markers={markers}
      routes={routes}
      className={className}
      ariaLabel="Pickup, drop-off, and driver map"
    />
  );
}
