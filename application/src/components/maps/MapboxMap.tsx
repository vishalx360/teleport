"use client";

import { env } from "@/env";
import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from "@/lib/constants";
import { cn } from "@/lib/utils";
import mapboxgl, {
  type GeoJSONSource,
  type Map as MapboxMapInstance,
  type Marker as MapboxMarker,
  type Popup as MapboxPopup,
} from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import "mapbox-gl/dist/mapbox-gl.css";

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapMarkerKind =
  | "pickup"
  | "dropoff"
  | "driver"
  | "current"
  | "default";

export type MapMarker = MapCoordinates & {
  id: string;
  kind?: MapMarkerKind;
  label?: string;
  iconUrl?: string;
  includeInBounds?: boolean;
  labelVisibility?: "always" | "click";
};

export type MapRoute = {
  id: string;
  coordinates: MapCoordinates[];
};

export type MapViewportBounds = [number, number, number, number];

type MapboxMapProps = {
  markers?: MapMarker[];
  routes?: MapRoute[];
  className?: string;
  ariaLabel?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  fitPadding?: number;
  maxFitZoom?: number;
  showControls?: boolean;
  showCurrentLocation?: boolean;
  selectionMode?: boolean;
  onMapClick?: (coordinates: MapCoordinates) => void;
  onCurrentLocation?: (coordinates: MapCoordinates) => void;
  onViewportChange?: (
    center: MapCoordinates,
    bounds: MapViewportBounds,
  ) => void;
};

export const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

export const MAP_MARKER_ICONS: Record<MapMarkerKind, string> = {
  pickup: "/map-markers/pickup.svg",
  dropoff: "/map-markers/dropoff.svg",
  driver: "/map-markers/driver.svg",
  current: "/map-markers/current-location.svg",
  default: "/map-markers/default.svg",
};

const ROUTE_SOURCE_ID = "teleport-routes";
const ROUTE_LAYER_ID = "teleport-routes-line";

export function createMapMarkerElement(marker: MapMarker) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "teleport-map-marker";
  element.setAttribute(
    "aria-label",
    marker.label ?? `${marker.kind ?? "default"} location`,
  );
  element.title = marker.label ?? "Map location";

  const image = document.createElement("img");
  image.src = marker.iconUrl ?? MAP_MARKER_ICONS[marker.kind ?? "default"];
  image.alt = "";
  image.width = 36;
  image.height = 36;
  image.draggable = false;
  image.style.cssText =
    "display:block;width:36px;height:36px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.55));";
  image.addEventListener(
    "error",
    () => {
      image.src = MAP_MARKER_ICONS.default;
    },
    { once: true },
  );
  element.appendChild(image);

  element.style.cssText =
    "width:36px;height:36px;padding:0;border:0;border-radius:9999px;background:transparent;cursor:pointer;";
  return element;
}

export function createMapPopupElement(marker: MapMarker) {
  const content = document.createElement("div");
  content.className = "teleport-map-popup-card";

  const indicator = document.createElement("span");
  indicator.className = "teleport-map-popup-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "teleport-map-popup-label";
  label.textContent = marker.label ?? "Map location";

  content.append(indicator, label);
  return content;
}

function routeCollection(routes: MapRoute[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: routes
      .filter((route) => route.coordinates.length >= 2)
      .map((route) => ({
        type: "Feature",
        properties: { id: route.id },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates.map(({ longitude, latitude }) => [
            longitude,
            latitude,
          ]),
        },
      })),
  };
}

export default function MapboxMap({
  markers = [],
  routes = [],
  className,
  ariaLabel = "Delivery map",
  initialCenter = DEFAULT_COORDINATES as [number, number],
  initialZoom = DEFAULT_ZOOM,
  fitPadding = 64,
  maxFitZoom = 14,
  showControls = true,
  showCurrentLocation = false,
  selectionMode = false,
  onMapClick,
  onCurrentLocation,
  onViewportChange,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markerRefs = useRef<MapboxMarker[]>([]);
  const popupRefs = useRef<MapboxPopup[]>([]);
  const fittedMarkerSignatureRef = useRef("");
  const onMapClickRef = useRef(onMapClick);
  const onCurrentLocationRef = useRef(onCurrentLocation);
  const onViewportChangeRef = useRef(onViewportChange);
  const initialOptionsRef = useRef({
    initialCenter,
    initialZoom,
    showControls,
    showCurrentLocation,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onCurrentLocationRef.current = onCurrentLocation;
  }, [onCurrentLocation]);

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const options = initialOptionsRef.current;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: options.initialCenter,
      zoom: options.initialZoom,
      attributionControl: true,
    });
    mapRef.current = map;

    if (options.showControls) {
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
    }

    if (options.showCurrentLocation) {
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        fitBoundsOptions: { maxZoom: 15 },
        trackUserLocation: false,
        showUserLocation: true,
        showUserHeading: true,
      });
      geolocateControl.on("geolocate", (event) => {
        onCurrentLocationRef.current?.({
          latitude: event.coords.latitude,
          longitude: event.coords.longitude,
        });
      });
      map.addControl(geolocateControl, "bottom-right");
    }

    map.on("click", (event) => {
      onMapClickRef.current?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      });
    });

    const publishViewport = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      if (!bounds) return;
      onViewportChangeRef.current?.(
        { latitude: center.lat, longitude: center.lng },
        [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
      );
    };
    map.on("moveend", publishViewport);

    map.once("load", () => {
      setIsLoaded(true);
      publishViewport();
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      popupRefs.current.forEach((popup) => popup.remove());
      popupRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = selectionMode ? "crosshair" : "";
  }, [selectionMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    markerRefs.current.forEach((marker) => marker.remove());
    popupRefs.current.forEach((popup) => popup.remove());
    popupRefs.current = [];
    markerRefs.current = markers.map((marker) => {
      const mapMarker = new mapboxgl.Marker({
        element: createMapMarkerElement(marker),
        anchor: "center",
      }).setLngLat([marker.longitude, marker.latitude]);

      if (marker.label) {
        const popup = new mapboxgl.Popup({
          offset: 28,
          closeButton: false,
          closeOnClick: false,
          className: "teleport-map-popup",
          maxWidth: "240px",
        }).setDOMContent(createMapPopupElement(marker));

        if (marker.labelVisibility === "click") {
          mapMarker.setPopup(popup);
        } else {
          popup.setLngLat([marker.longitude, marker.latitude]).addTo(map);
          popupRefs.current.push(popup);
        }
      }
      return mapMarker.addTo(map);
    });

    const collection = routeCollection(routes);
    const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(collection);
    } else {
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: collection });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    }

    const visibleMarkers = markers.filter(
      (marker) => marker.includeInBounds !== false,
    );
    const visibleMarkerSignature = visibleMarkers
      .map(
        ({ id, latitude, longitude }) =>
          `${id}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`,
      )
      .sort()
      .join("|");
    if (visibleMarkerSignature === fittedMarkerSignatureRef.current) return;
    fittedMarkerSignatureRef.current = visibleMarkerSignature;

    if (visibleMarkers.length === 1) {
      const marker = visibleMarkers[0]!;
      map.easeTo({
        center: [marker.longitude, marker.latitude],
        zoom: maxFitZoom,
      });
    } else if (visibleMarkers.length > 1) {
      const bounds = visibleMarkers.reduce(
        (nextBounds, marker) =>
          nextBounds.extend([marker.longitude, marker.latitude]),
        new mapboxgl.LngLatBounds(),
      );
      map.fitBounds(bounds, {
        padding: fitPadding,
        maxZoom: maxFitZoom,
        duration: 500,
      });
    }
  }, [fitPadding, isLoaded, markers, maxFitZoom, routes]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full min-h-48 w-full overflow-hidden rounded-2xl",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
    />
  );
}
