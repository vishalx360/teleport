import { env } from "@/env";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const GetAddressFromCoordinates = async ({ longitude, latitude }: {
  longitude: number;
  latitude: number;
}) => {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${env.NEXT_PUBLIC_MAPBOX_TOKEN}`
  );
  const data = await response.json();
  const address = data.features[0]?.place_name || 'Unknown location';
  return address
};