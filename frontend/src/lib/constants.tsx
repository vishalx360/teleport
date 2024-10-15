import { BikeIcon, Truck } from "lucide-react";


export const DEFAULT_COORDINATES = [77.594566, 12.971599,]
export const DEFAULT_ZOOM = 12;


export type Vehicle = {
    name: string;
    price: number;
    perKmCost: number;
    capacity: string;
    dimensions: string;
    weightLimit: string;
}


export const vehicleIconMap: {
    [key: string]: JSX.Element
} = {
    "Bike": <BikeIcon className="h-8 w-8" />,
    "Mini-Truck": <Truck className="h-8 w-8" />
}

export const vehicles: Vehicle[] = [
    {
        name: "Bike",
        price: 200,
        perKmCost: 20,
        capacity: "1 cubic meter",
        dimensions: "1.8m x 0.8m x 1.1m",
        weightLimit: "150 kg"
    },
    {
        name: "Mini-Truck",
        price: 800,
        perKmCost: 50,
        capacity: "7-8 cubic meters",
        dimensions: "3.5m x 2m x 2m",
        weightLimit: "2000 kg"
    },
]
