'use client'

import { AddressPicker } from "@/components/AddressPicker"
import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import useBookingStore from "@/context/BookingStore"
import { vehicles } from "@/lib/constants"
import { AlertTriangle, Clock, DollarSign, Info, Package } from "lucide-react"
import Link from "next/link"
import MapView from "./MapView"
import { Skeleton } from "@/components/ui/skeleton"

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

// Vehicle Selection Component
const VehicleSelection = () => {
    const { distance, setSelectedVehicle, calculating, selectedVehicle } = useBookingStore();

    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Available Vehicles</h3>
            {vehicles.map((vehicle) => (
                <label key={vehicle.name} className="block cursor-pointer">
                    <div
                        className={`flex items-center justify-between p-3 border rounded-lg ${selectedVehicle?.name === vehicle.name ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                            }`}
                        onClick={() => setSelectedVehicle(vehicle)}
                    >
                        <div className="flex items-center space-x-3">
                            <input
                                type="radio"
                                name="vehicle"
                                value={vehicle.name}
                                checked={selectedVehicle?.name === vehicle.name}
                                onChange={() => setSelectedVehicle(vehicle)}
                                className="form-radio text-blue-600 hidden"
                            />
                            {vehicle.icon}
                            <div>
                                <h4 className="font-medium">{vehicle.name}</h4>
                                <p className="text-sm text-gray-600">Weight Limit: {vehicle.weightLimit}</p>
                                <p className="text-sm">₹{vehicle.perKmCost}/Km</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {
                                calculating ?

                                    <Skeleton className="h-4 w-[250px]" />

                                    :
                                    <p className="font-semibold">₹{(vehicle.perKmCost * distance).toFixed(2)}</p>
                            }
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
    )
};

// Estimated Fare Component
const EstimatedFare = () => {
    const { distance, selectedVehicle } = useBookingStore();

    return (
        <div className="bg-green-50 p-3 rounded-lg space-y-4">
            {selectedVehicle && (
                <div>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Estimated Base Price</h3>
                        <p className="text-lg font-bold text-green-700">₹{selectedVehicle.perKmCost * distance}</p>
                    </div>
                    <p className="text-sm text-gray-600">Based on {distance} km distance</p>
                    <p className="text-sm text-gray-600">
                        *Without taxes, service and surge charge
                    </p>
                </div>
            )}
        </div>
    )
};

export default function BookingPage() {
    const { pickupAddress, deliveryAddress, setPickUpAddress, setDeliveryAddress } = useBookingStore();

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
                        <AddressPicker focused={pickupAddress === null} address={pickupAddress} addressType="pickup" disabledAddressId={deliveryAddress?.id} updateAddress={setPickUpAddress} />
                        <AddressPicker focused={pickupAddress !== null && deliveryAddress === null} address={deliveryAddress} addressType="delivery" disabledAddressId={pickupAddress?.id} updateAddress={setDeliveryAddress} />
                    </div>
                    {/* Safety Info */}
                    {!pickupAddress || !deliveryAddress ?
                        <SafetyInfo />
                        : <>
                            <MapView
                                pickupLocation={pickupAddress}
                                deliveryLocation={deliveryAddress}
                            />
                            <VehicleSelection />
                            <EstimatedFare />
                        </>
                    }
                </CardContent>
                <CardFooter>
                    <Link className="w-full" href="/checkout" passHref>
                        <Button className="w-full" disabled={!pickupAddress || !deliveryAddress}>
                            Book Now
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
