import { BookingStatus, type VehicleClass } from "@prisma/client";
import { UserCog, UserIcon } from "lucide-react";

export const DEFAULT_COORDINATES = [77.594566, 12.971599,]
export const DEFAULT_ZOOM = 12;


export const formattedStatus: Record<BookingStatus | "LOADING", string> = {
    [BookingStatus.BOOKED]: "Booked",
    [BookingStatus.ACCEPTED]: "Accepted",
    [BookingStatus.ARRIVED]: "Arrived",
    [BookingStatus.PICKED_UP]: "Picked Up",
    [BookingStatus.IN_TRANSIT]: "In Transit",
    [BookingStatus.DELIVERED]: "Delivered",
    [BookingStatus.CANCELLED]: "Cancelled",
    [BookingStatus.FAILED]: "Failed",
    "LOADING": "Loading..."
};


export const userRoleIconMap: {
    [key: string]: JSX.Element
} = {
    "USER": <UserIcon className="h-8 w-8" />,
    "DRIVER": <UserCog className="h-8 w-8" />
}

export type Vehicle = {
    class: VehicleClass;
    name: string;
    description: string;
    icon: string;
    perKmCost: number;
    dimensions: string;
    maxWeight: string;
}

export const vehicles: Vehicle[] = [
    {
        class: "BIKE",
        name: "Bike",
        description: "A two-wheeler for quick deliveries",
        icon: "/vehicles/BIKE.svg",
        perKmCost: 50,
        dimensions: "40cm x 40cm x 40cm",
        maxWeight: "20 kg"
    },
    {
        class: "PICKUP_TRUCK",
        name: "Pickup-Truck",
        description: "A small truck for medium-sized deliveries",
        icon: "/vehicles/PICKUP_TRUCK.svg",
        perKmCost: 100,
        dimensions: "6f x 7f x 4f",
        maxWeight: "850 kg"
    },
    {
        class: "TRUCK",
        name: "Truck",
        description: "A large truck for heavy deliveries",
        icon: "/vehicles/TRUCK.svg",
        perKmCost: 200,
        dimensions: "10f x 7f x 6f",
        maxWeight: "1700 kg"
    },
]

export const vehicleClassMap: {
    [key: string]: Vehicle
} = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.class] = vehicle;
    return acc;
}, {} as { [key: string]: Vehicle });