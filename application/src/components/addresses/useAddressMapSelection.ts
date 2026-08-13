"use client";

import type { MapCoordinates } from "@/components/maps/MapboxMap";
import { GetAddressFromCoordinates } from "@/lib/geoUtils";
import { useCallback, useRef, useState } from "react";
import type { SelectedAddressLocation } from "./AddressCreationPanel";

export default function useAddressMapSelection() {
  const [selection, setSelection] = useState<SelectedAddressLocation | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const requestIdRef = useRef(0);

  const selectCoordinates = useCallback(async (coordinates: MapCoordinates) => {
    const requestId = ++requestIdRef.current;
    setSelection({ ...coordinates, address: "Finding address…" });
    setIsResolving(true);

    try {
      const address = await GetAddressFromCoordinates(coordinates);
      if (requestId === requestIdRef.current) {
        setSelection({ ...coordinates, address });
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setSelection({
          ...coordinates,
          address: `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
        });
      }
    } finally {
      if (requestId === requestIdRef.current) setIsResolving(false);
    }
  }, []);

  const selectLocation = useCallback((location: SelectedAddressLocation) => {
    requestIdRef.current += 1;
    setSelection(location);
    setIsResolving(false);
  }, []);

  const resetSelection = useCallback(() => {
    requestIdRef.current += 1;
    setSelection(null);
    setIsResolving(false);
  }, []);

  return {
    selection,
    isResolving,
    selectCoordinates,
    selectLocation,
    resetSelection,
  };
}
