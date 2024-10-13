'use client'

import { Address } from "@/components/Address"
import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertTriangle, BikeIcon, Clock, DollarSign, Info, MapPin, Package, Truck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from 'react'

type Vehicle = {
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

interface BookingPageProps {
    estimatedPickupTime: string;
    distance: number;
}

const defaultValues: BookingPageProps = {
    estimatedPickupTime: "in 9 mins",
    distance: 2,
}

// Safety Info Component
const SafetyInfo = () => (
    <Card>
        <CardHeader className='flex-row gap-2'>
            <CardTitle className="text-lg font-semibold">Things to keep in mind</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                <p className="text-sm">Avoid sending expensive or fragile items</p>
            </div>
            <div className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                <p className="text-sm">Items should fit on a bike or mini truck</p>
            </div>
            <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p className="text-sm">No alcohol, illegal or restricted items</p>
            </div>
            <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <p className="text-sm">Order before 7PM to avoid delays in delivery</p>
            </div>
        </CardContent>
    </Card>
);

// Map View Component
const MapView = ({ pickupLocation, deliveryLocation, distance }) => (
    <div className="relative h-48 w-full rounded-lg overflow-hidden">
        <Image
            src="/map.png"
            alt="Map showing route between pickup and delivery locations"
            layout="fill"
            objectFit="cover"
        />
        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-sm font-medium">
            {distance} kms • 20-25 mins
        </div>
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded text-sm font-medium flex items-center">
            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
            {pickupLocation}
        </div>
        <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded text-sm font-medium flex items-center">
            <MapPin className="h-4 w-4 mr-1 text-blue-500" />
            {deliveryLocation}
        </div>
    </div>
);

// Vehicle Selection Component
const VehicleSelection = ({ vehicles, selectedVehicle, setSelectedVehicle }) => (
    <div className="space-y-4">
        <h3 className="font-semibold">Available Vehicles</h3>
        {vehicles.map((vehicle) => (
            <label key={vehicle.name} className="block cursor-pointer">
                <div
                    className={`flex items-center justify-between p-3 border rounded-lg ${selectedVehicle.name === vehicle.name ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                    onClick={() => setSelectedVehicle(vehicle)}
                >
                    <div className="flex items-center space-x-3">
                        <input
                            type="radio"
                            name="vehicle"
                            value={vehicle.name}
                            checked={selectedVehicle.name === vehicle.name}
                            onChange={() => setSelectedVehicle(vehicle)}
                            className="form-radio text-blue-600 hidden"
                        />
                        {vehicle.icon}
                        <div>
                            <h4 className="font-medium">{vehicle.name}</h4>
                            <p className="text-sm text-gray-600">Weight Limit: {vehicle.weightLimit}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">₹{vehicle.perKmCost}/Km</p>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <Info className="h-4 w-4" />
                                    <span className="sr-only">Vehicle information</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-2">
                                    <h5 className="font-semibold">{vehicle.name} Details</h5>
                                    <p className="text-sm">Capacity: {vehicle.capacity}</p>
                                    <p className="text-sm">Dimensions: {vehicle.dimensions}</p>
                                    <p className="text-sm">Weight Limit: {vehicle.weightLimit}</p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </label>
        ))}
    </div>
);

// Estimated Fare Component
const EstimatedFare = ({ selectedVehicle, distance }) => (
    <div className="bg-green-50 p-3 rounded-lg space-y-4">
        {selectedVehicle && (
            <div>
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Estimated Base Price</h3>
                    <p className="text-lg font-bold text-green-700">₹{selectedVehicle.perKmCost * distance}</p>
                </div>
                <p className="text-sm text-gray-600">Based on {distance} km distance</p>
                <p className="text-sm text-gray-600">
                    *Without taxes and service charge
                </p>
            </div>
        )}
    </div>
);

export default function BookingPage({
    estimatedPickupTime = defaultValues.estimatedPickupTime,
    distance = defaultValues.distance

}: BookingPageProps = defaultValues
) {
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(vehicles[0]) // Set default vehicle here
    const [pickup, setPickUp] = useState<Address | null>(null);
    const [delivery, setDelivery] = useState<Address | null>(null);

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='flex-row gap-2'>
                    <BackButton />
                    <CardTitle className="text-2xl font-bold mt-2">Create Booking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Address Input */}
                    <div className="space-y-4">
                        <Address focused={pickup === null} address={pickup} addressType="pickup" onEdit={setPickUp} />
                        <Address focused={pickup !== null && delivery === null} address={delivery} addressType="delivery" onEdit={setDelivery} />
                    </div>
                    {/* Safety Info */}
                    {!pickup || !delivery ?
                        <SafetyInfo />
                        : <>
                            {/* Map View */}
                            <MapView
                                pickupLocation={pickup?.location}
                                deliveryLocation={delivery?.location}
                                distance={distance}
                            />
                            {/* Vehicle Selection */}
                            <VehicleSelection
                                vehicles={vehicles}
                                selectedVehicle={selectedVehicle}
                                setSelectedVehicle={setSelectedVehicle}
                            />
                            {/* Estimated Fare */}
                            <EstimatedFare selectedVehicle={selectedVehicle} distance={distance} />
                        </>
                    }
                </CardContent>
                <CardFooter>
                    <Button className="w-full" disabled={!pickup || !delivery}>
                        <Link href="/checkout" passHref>
                            Book Now
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
