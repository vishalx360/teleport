import { BikeIcon, Truck } from "lucide-react";

export type Vehicle = {
    name: string;
    icon: React.ReactNode;
    price: number;
    perKmCost: number;
    capacity: string;
    dimensions: string;
    weightLimit: string;
}

export const vehicles: Vehicle[] = [
    {
        name: "Bike",
        icon: <BikeIcon className="h-8 w-8" />,
        price: 200,
        perKmCost: 20,
        capacity: "1 cubic meter",
        dimensions: "1.8m x 0.8m x 1.1m",
        weightLimit: "150 kg"
    },
    {
        name: "Mini-Truck",
        icon: <Truck className="h-8 w-8" />,
        price: 800,
        perKmCost: 50,
        capacity: "7-8 cubic meters",
        dimensions: "3.5m x 2m x 2m",
        weightLimit: "2000 kg"
    },
]
