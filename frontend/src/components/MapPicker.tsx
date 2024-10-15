import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import mapboxgl, { Marker } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import LocationForm from './LocationForm';

import { env } from '@/env';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DEFAULT_COORDINATES, DEFAULT_ZOOM } from '@/lib/constants';


const MapPicker = ({ onSubmit, isPending }: {
    onSubmit: () => void;
    isPending: boolean;
}) => {
    const mapContainerRef = useRef();
    const mapRef = useRef();
    const [selectedLocation, setSelectedLocation] = useState({
        address: '',
        latitude: null,
        longitude: null,
    });
    const markerRef = useRef<Marker | null>(null);

    useEffect(() => {
        mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN

        // Initialize the map
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: DEFAULT_COORDINATES,
            zoom: DEFAULT_ZOOM,
        });

        // Add geocoder control
        mapRef.current.addControl(
            new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
            })
        );

        // Add navigation and geolocation controls
        mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
            showUserHeading: true,
        });
        mapRef.current.addControl(geolocateControl, 'top-right');

        // Listen for geolocation control results to update marker and location info
        geolocateControl.on('geolocate', (event) => {
            const { longitude, latitude } = event.coords;
            updateLocation(longitude, latitude);
        });

        // Handle map click events to place marker
        mapRef.current.on('click', async (event) => {
            const { lng, lat } = event.lngLat;
            await updateLocation(lng, lat);
        });

        // Clean up on unmount
        return () => mapRef.current.remove();
    }, []);

    // Function to update location based on coordinates
    const updateLocation = async (longitude, latitude) => {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`
        );
        const data = await response.json();
        const address = data.features[0]?.place_name || 'Unknown location';

        setSelectedLocation({
            address,
            latitude,
            longitude,
        });

        // Place a marker at the selected location
        if (markerRef.current) {
            markerRef.current.remove();
        }
        markerRef.current = new mapboxgl.Marker()
            .setLngLat([longitude, latitude])
            .addTo(mapRef.current);

        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14 });
    };

    // Button for manually setting current location
    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { longitude, latitude } = position.coords;
                    updateLocation(longitude, latitude);
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
            <div ref={mapContainerRef} className="w-full h-[350px] rounded-xl" />
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
