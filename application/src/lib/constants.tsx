import { BikeIcon, Truck, UserCog, UserIcon } from "lucide-react";


export const DEFAULT_COORDINATES = [77.594566, 12.971599,]
export const DEFAULT_ZOOM = 12;


export type Vehicle = {
    name: string;
    id: string;
    price: number;
    perKmCost: number;
    capacity: string;
    dimensions: string;
    weightLimit: string;
}


export const vehicleIconMap: {
    [key: string]: JSX.Element
} = {
    "BIKE": <BikeIcon className="h-8 w-8" />,
    "MINI_TRUCK": <Truck className="h-8 w-8" />
}

export const userRoleIconMap: {
    [key: string]: JSX.Element
} = {
    "USER": <UserIcon className="h-8 w-8" />,
    "DRIVER": <UserCog className="h-8 w-8" />
}


export const vehicles: Vehicle[] = [
    {
        name: "Bike",
        id: "BIKE",
        price: 200,
        perKmCost: 20,
        capacity: "1 cubic meter",
        dimensions: "1.8m x 0.8m x 1.1m",
        weightLimit: "150 kg"
    },
    {
        name: "Mini-Truck",
        id: "MINI_TRUCK",
        price: 800,
        perKmCost: 50,
        capacity: "7-8 cubic meters",
        dimensions: "3.5m x 2m x 2m",
        weightLimit: "2000 kg"
    },
]