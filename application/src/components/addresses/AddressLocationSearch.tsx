"use client";

import { env } from "@/env";
import type { MapViewportBounds } from "@/components/maps/MapboxMap";
import { Check, Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SelectedAddressLocation } from "./AddressCreationPanel";

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
};

export default function AddressLocationSearch({
  onSelect,
  proximity,
  bounds,
}: {
  onSelect: (location: SelectedAddressLocation) => void;
  proximity?: { latitude: number; longitude: number } | null;
  bounds?: MapViewportBounds | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3 || trimmedQuery === selectedAddress) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          access_token: env.NEXT_PUBLIC_MAPBOX_TOKEN,
          autocomplete: "true",
          limit: "5",
          language: "en",
          country: "in",
          types: "address,poi,place,postcode,locality,neighborhood",
        });
        if (proximity) {
          params.set(
            "proximity",
            `${proximity.longitude},${proximity.latitude}`,
          );
        }
        if (bounds) params.set("bbox", bounds.join(","));
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Location search failed");
        const payload = (await response.json()) as {
          features?: SearchResult[];
        };
        if (requestId === requestIdRef.current) {
          setResults(
            (payload.features ?? []).filter(
              (result) =>
                Array.isArray(result.center) && result.center.length === 2,
            ),
          );
          setIsOpen(true);
          setHasSearched(true);
        }
      } catch (error) {
        if (
          requestId === requestIdRef.current &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setResults([]);
          setHasSearched(true);
        }
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bounds, proximity, query, selectedAddress]);

  const selectResult = (result: SearchResult) => {
    const [longitude, latitude] = result.center;
    setQuery(result.place_name);
    setSelectedAddress(result.place_name);
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    onSelect({ latitude, longitude, address: result.place_name });
  };

  return (
    <div className="relative space-y-2">
      <label htmlFor="address-location-search" className="text-sm font-medium">
        Search for a location
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          id="address-location-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedAddress(null);
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          autoComplete="off"
          placeholder="Search address, landmark, or area"
          aria-autocomplete="list"
          aria-controls="address-location-results"
          aria-expanded={isOpen && (isSearching || hasSearched)}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/[.04] pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10 [&::-webkit-search-cancel-button]:hidden"
        />
        {isSearching ? (
          <Loader2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-300" />
        ) : query ? (
          <button
            type="button"
            aria-label="Clear location search"
            onClick={() => {
              setQuery("");
              setSelectedAddress(null);
              setResults([]);
              setIsOpen(false);
              setHasSearched(false);
            }}
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="text-[11px] leading-4 text-slate-500">
        Results are limited to the visible map area.
      </p>

      {isOpen && (isSearching || hasSearched) && (
        <div
          id="address-location-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#1b1d22] p-1.5 shadow-2xl shadow-black/60"
        >
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected={result.place_name === selectedAddress}
              onClick={() => selectResult(result)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[.07] focus:bg-white/[.07] focus:outline-none"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-300">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">
                  {result.text}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-400">
                  {result.place_name}
                </span>
              </span>
              {result.place_name === selectedAddress && (
                <Check className="ml-auto mt-1 h-4 w-4 shrink-0 text-blue-300" />
              )}
            </button>
          ))}
          {!isSearching && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-slate-500">
              No matching locations found in this map area.
            </p>
          )}
          <p className="border-t border-white/10 px-3 pb-1 pt-2 text-right text-[10px] text-slate-600">
            Search powered by Mapbox
          </p>
        </div>
      )}
    </div>
  );
}
