'use client';

import { DEFAULT_COORDINATES } from '@/lib/constants';
import { Map as MapComponent, MapMarker, MapRoute, MarkerContent, useMap } from '@/components/ui/map';
import { useEffect, useMemo } from 'react';
import type MapLibreGL from 'maplibre-gl';

type Point = {
    latitude: number;
    longitude: number;
    icon?: string;
    inview?: boolean;
    markerText?: string;
};

// Component to handle fitting bounds to points
function BoundsFitter({ points }: { points: Point[] }) {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded || points.length === 0) return;

        const viewablePoints = points.filter(p => p.inview);
        if (viewablePoints.length === 0) return;

        const firstPoint = viewablePoints[0];
        if (!firstPoint) return;

        if (viewablePoints.length === 1) {
            map.flyTo({
                center: [firstPoint.longitude, firstPoint.latitude],
                zoom: 14,
                duration: 1000,
            });
            return;
        }

        // Create bounds from all viewable points
        const bounds: [[number, number], [number, number]] = [
            [firstPoint.longitude, firstPoint.latitude],
            [firstPoint.longitude, firstPoint.latitude],
        ];

        viewablePoints.forEach(point => {
            bounds[0][0] = Math.min(bounds[0][0], point.longitude);
            bounds[0][1] = Math.min(bounds[0][1], point.latitude);
            bounds[1][0] = Math.max(bounds[1][0], point.longitude);
            bounds[1][1] = Math.max(bounds[1][1], point.latitude);
        });

        map.fitBounds(bounds as MapLibreGL.LngLatBoundsLike, { 
            padding: 50, 
            maxZoom: 12,
            duration: 1000,
        });
    }, [map, isLoaded, points]);

    return null;
}

const Map = ({ points, extraPoints = [], lines }: {
    points: Point[];
    extraPoints?: Point[];
    lines?: [Point, Point][];
}) => {
    const allPoints = useMemo(() => [...points, ...extraPoints], [points, extraPoints]);
    
    // Convert lines to route coordinates
    const routeCoordinates = useMemo<[number, number][]>(() => {
        if (!lines || lines.length === 0) return [];
        const firstLine = lines[0];
        if (!firstLine) return [];
        const [start, end] = firstLine;
        return [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
        ];
    }, [lines]);

    return (
        <div className="w-full h-full rounded-xl overflow-hidden">
            <MapComponent
                center={[DEFAULT_COORDINATES[0] ?? -74.006, DEFAULT_COORDINATES[1] ?? 40.7128]}
                zoom={20}
            >
                <BoundsFitter points={allPoints} />
                
                {/* Render route line if we have line coordinates */}
                {routeCoordinates.length >= 2 && (
                    <MapRoute
                        coordinates={routeCoordinates}
                        color="#888"
                        width={4}
                        opacity={0.75}
                    />
                )}
                
                {/* Render markers for all points */}
                {allPoints.map((point, index) => (
                    <MapMarker
                        key={`point-${index}-${point.latitude}-${point.longitude}`}
                        longitude={point.longitude}
                        latitude={point.latitude}
                    >
                        <MarkerContent>
                            {point.icon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                    src={point.icon} 
                                    alt={point.markerText || 'Marker'} 
                                    className="w-8 h-8"
                                />
                            ) : (
                                <div className="size-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
                                    <div className="size-2 rounded-full bg-white" />
                                </div>
                            )}
                        </MarkerContent>
                    </MapMarker>
                ))}
            </MapComponent>
        </div>
    );
};

export default Map;
