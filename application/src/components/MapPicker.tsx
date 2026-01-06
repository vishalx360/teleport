'use client';

import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from '@/lib/constants';
import { useEffect, useState } from 'react';
import LocationForm from './LocationForm';
import { Map, MapControls, MapMarker, MarkerContent, useMap } from './ui/map';

export interface LocationType {
    address: string;
    latitude: number | null;
    longitude: number | null;
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { 
    onLocationSelect: (coords: { lng: number; lat: number }) => void 
}) {
    const { map, isLoaded } = useMap();

    useEffect(() => {
        if (!map || !isLoaded) return;

        const handleClick = (e: maplibregl.MapMouseEvent) => {
            onLocationSelect({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        };

        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [map, isLoaded, onLocationSelect]);

    return null;
}

// Reverse geocode using Nominatim (free, no API key required)
async function reverseGeocode(longitude: number, latitude: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
                headers: {
                    'User-Agent': 'Teleport-App/1.0' // Nominatim requires a User-Agent
                }
            }
        );
        const data = await response.json();
        return data.display_name || 'Unknown location';
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return 'Unknown location';
    }
}

const MapPicker = ({ onSubmit, isPending }: {
    onSubmit: () => void;
    isPending: boolean;
}) => {
    const [selectedLocation, setSelectedLocation] = useState<LocationType>({
        address: '',
        latitude: null,
        longitude: null,
    });

    const handleLocationSelect = async (coords: { lng: number; lat: number }) => {
        const address = await reverseGeocode(coords.lng, coords.lat);
        setSelectedLocation({
            address,
            latitude: coords.lat,
            longitude: coords.lng,
        });
    };

    const handleLocate = async (coords: { longitude: number; latitude: number }) => {
        const address = await reverseGeocode(coords.longitude, coords.latitude);
        setSelectedLocation({
            address,
            latitude: coords.latitude,
            longitude: coords.longitude,
        });
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { longitude, latitude } = position.coords;
                    const address = await reverseGeocode(longitude, latitude);
                    setSelectedLocation({
                        address,
                        latitude,
                        longitude,
                    });
                },
                (error) => {
                    alert('Unable to retrieve your location.');
                    console.error(error);
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    return (
        <div className='flex md:flex-row-reverse flex-col gap-4'>
            <div className="w-full h-[350px] rounded-xl overflow-hidden">
                <Map 
                    center={[DEFAULT_COORDINATES[0] ?? -74.006, DEFAULT_COORDINATES[1] ?? 40.7128]} 
                    zoom={DEFAULT_ZOOM}
                >
                    <MapClickHandler onLocationSelect={handleLocationSelect} />
                    <MapControls 
                        position="top-right" 
                        showZoom 
                        showLocate 
                        onLocate={handleLocate}
                    />
                    {selectedLocation.latitude !== null && selectedLocation.longitude !== null && (
                        <MapMarker
                            longitude={selectedLocation.longitude}
                            latitude={selectedLocation.latitude}
                        >
                            <MarkerContent>
                                <div className="size-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
                                    <div className="size-2 rounded-full bg-white" />
                                </div>
                            </MarkerContent>
                        </MapMarker>
                    )}
                </Map>
            </div>
            <LocationForm
                handleCurrentLocation={handleCurrentLocation}
                mapLocation={selectedLocation}
                onSubmit={onSubmit}
                isPending={isPending}
            />
        </div>
    );
};

export default MapPicker;
