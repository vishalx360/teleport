
import mapboxgl from 'mapbox-gl';
import { useCallback, useEffect, useRef } from 'react';

import { env } from "@/env";
import { DEFAULT_COORDINATES } from '@/lib/constants';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';


type Point = {
    latitude: number;
    longitude: number;
    icon: string;
    inview?: boolean;
};

const Map = ({ points, lines }: {
    points: Point[];
    lines: [[Point, Point]];
}) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRefs = useRef([]);

    useEffect(() => {
        if (!mapRef.current) {
            // Initialize Mapbox access token
            mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

            // Initialize the map only once
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: DEFAULT_COORDINATES,
                zoom: 20,
            });
        }

        return () => {
            // Cleanup markers and map on component unmount
            markerRefs.current.forEach(marker => marker.remove());
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (mapRef.current && points.length) {
            addMarkers(points);
            lines?.forEach(line => drawLine(line));
        }
    }, [points, lines]);


    const addMarkers = (points) => {
        // Clear existing markers
        markerRefs.current.forEach(marker => marker.remove());
        markerRefs.current = [];

        const bounds = new mapboxgl.LngLatBounds();

        // Add new markers for each point and update bounds
        points.forEach((point, index) => {
            const { latitude, longitude, markerText } = point;

            // Create a custom HTML element for the marker
            const markerElement = document.createElement('img');
            markerElement.src = point.icon;

            const marker = new mapboxgl.Marker({ element: markerElement })
                .setLngLat([longitude, latitude])
                .addTo(mapRef.current);

            markerRefs.current.push(marker);
            { point.inview && bounds.extend([longitude, latitude]); }
        });

        if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
        }
    };
    const drawLine = useCallback((points: Point[]) => {
        // Ensure mapRef is available and valid
        if (!mapRef.current || points.length < 2) {
            console.warn("Insufficient points or map not available");
            return;
        }

        const [start, end] = points;

        const lineGeoJSON = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [start.longitude, start.latitude], // Start point
                    [end.longitude, end.latitude],     // End point
                ],
            },
        };

        const addOrUpdateLine = () => {
            const lineSource = mapRef.current.getSource('line');

            // Update the existing line data if the source already exists
            if (lineSource) {
                const currentData = lineSource._data || {};
                if (JSON.stringify(currentData.geometry?.coordinates) !== JSON.stringify(lineGeoJSON.geometry.coordinates)) {
                    lineSource.setData(lineGeoJSON);
                }
            } else {
                // Add a new source and layer if it doesn't exist
                mapRef.current.addSource('line', {
                    type: 'geojson',
                    data: lineGeoJSON,
                });

                mapRef.current.addLayer({
                    id: 'line',
                    type: 'line',
                    source: 'line',
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round',
                    },
                    paint: {
                        'line-color': '#888',
                        'line-width': 4,
                        'line-opacity': 0.75,
                    },
                });
            }
        };

        // Check if the style is loaded
        if (mapRef.current.isStyleLoaded()) {
            addOrUpdateLine();
        } else {
            // Wait for the style to load and then add/update the line
            mapRef.current.once('style.load', addOrUpdateLine);
        }
    }, []);

    return <div ref={mapContainerRef} className="w-full h-full rounded-xl" />;
};



export default Map;