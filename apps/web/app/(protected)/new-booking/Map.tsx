
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';

import { env } from "@/env";
import { DEFAULT_COORDINATES } from '@/lib/constants';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';


const Map = ({ points, extraPoints }: {
    points: { latitude: number, longitude: number, markerText: string, inview: boolean }[];
    extraPoints: { latitude: number, longitude: number, markerText: string, inview: boolean }[];
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
                zoom: 14,
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
            // Add markers and fit the map to show them
            addMarkers([...points, ...extraPoints]);
            drawCurvedLine(points);
        }
    }, [points]);


    const addMarkers = (points) => {
        // Clear existing markers
        markerRefs.current.forEach(marker => marker.remove());
        markerRefs.current = [];

        const bounds = new mapboxgl.LngLatBounds();

        // Add new markers for each point and update bounds
        points.forEach((point, index) => {
            const { latitude, longitude, markerText } = point;

            // Create a custom HTML element for the marker
            const markerElement = document.createElement('div');
            markerElement.className = 'custom-marker';
            markerElement.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span style="margin-left: 4px; color: black; font-size: 12px;">${markerText}</span>
                </div>
            `;

            // Apply additional styles to the marker container
            markerElement.style.background = 'white';
            markerElement.style.padding = '4px 8px';
            markerElement.style.borderRadius = '4px';
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';

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
    const drawCurvedLine = (points) => {
        if (points.length < 2) return; // Need at least 2 points

        const [start, end] = points;

        // Generate a GeoJSON LineString with a curved path
        const lineGeoJSON = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [start.longitude, start.latitude], // Start point
                    [start.longitude + (end.longitude - start.longitude) / 2, start.latitude + (end.latitude - start.latitude) / 2 + 0.0007], // Control point for curve
                    [end.longitude, end.latitude], // End point
                ],
            },
        };
        mapRef.current.on('load', function () {
            // Add the line layer to the map
            if (mapRef.current?.getSource('curved-line')) {
                mapRef.current?.getSource('curved-line').setData(lineGeoJSON);
            } else {
                mapRef.current?.addSource('curved-line', {
                    type: 'geojson',
                    data: lineGeoJSON,
                });
                mapRef.current?.addLayer({
                    id: 'curved-line',
                    type: 'line',
                    source: 'curved-line',
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round',
                    },
                    paint: {
                        'line-color': '#888',
                        'line-width': 4,
                        'line-opacity': 0.75
                    },
                });
            }
        })
    };
    return <div ref={mapContainerRef} className="w-full h-full rounded-xl" />;
};



export default Map;