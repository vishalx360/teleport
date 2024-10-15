'use client'

import BackButton from '@/components/BackButton'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import useBookingStore from '@/context/BookingStore'
import { vehicleIconMap, vehicles } from '@/lib/constants'
import { ArrowRight, Clock } from "lucide-react"
import { useRouter } from 'next/navigation'

// Default values for props
const defaultCheckoutData = {
    totalAmount: 54,
    savings: 6,
    addresses: {
        pickup: {
            type: "pickup",
            location: "Flat",
            address: "ABC Building, 3rd Floor",
            name: "Vishal Kumar",
            contact: "+91123456789"
        },
        delivery: {
            type: "delivery",
            location: "Work",
            address: "1st Floor XYZ Building",
            name: "John Doe",
            contact: "+91123456788"
        }
    },
    distance: 2,
    estimatedDeliveryTime: "20-25 mins",
    pickupTime: "9 mins",
    deliveryFee: 60,
    discountPercentage: 10,
    discountAmount: 6,
    vehicle: vehicles[0]
}

type CheckoutProps = typeof defaultCheckoutData

export default function CheckoutPage({
    estimatedDeliveryTime = defaultCheckoutData.estimatedDeliveryTime,
    pickupTime = defaultCheckoutData.pickupTime,
}: CheckoutProps = defaultCheckoutData) {

    const { distance, pickupAddress, deliveryAddress, selectedVehicle, discountPercentage } = useBookingStore();

    const router = useRouter()

    if (pickupAddress === null || deliveryAddress === null || selectedVehicle === null) {
        return router.push('/booking');
    };
    const price = selectedVehicle.perKmCost * distance;
    const discount = price * (discountPercentage / 100);
    const finalPrice = price - discount;

    const formattedPrice = `₹${price.toFixed(2)}`
    const formattedDiscount = `₹${discount.toFixed(2)}`
    const formattedFinalPrice = `₹${finalPrice.toFixed(2)}`;

    const VehicleIcon = vehicleIconMap[selectedVehicle.name];
    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='flex-row gap-2'>
                    <BackButton />
                    <CardTitle className="text-2xl font-bold">Checkout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h2 className="text-xl font-semibold">To Pay</h2>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-3xl font-bold">{formattedFinalPrice}</span>
                            <span className="text-green-600 font-medium">You save {formattedDiscount}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold">Delivery Details</h3>
                        <div className="flex gap-3 items-center ">
                            <span>
                                {pickupAddress?.nickname}
                            </span>
                            <ArrowRight className='w-5 h-5' />
                            <span>

                                {deliveryAddress?.nickname}
                            </span>
                        </div>
                        <p className="text-sm">{distance} km • Est. delivery in {estimatedDeliveryTime}</p>

                    </div>
                    <Card className="p-2 px-4">
                        <div className="flex items-center justify-between gap-5">
                            <div className="flex items-center gap-5">
                                {VehicleIcon}
                                <div className=" items-center text-green-600">
                                    <span className="text-sm font-bold mr-2 text-gray-600">{selectedVehicle?.name}</span>
                                    <div className="flex items-center text-green-600">
                                        <Clock className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">Est. Pick up in {pickupTime}</span>
                                    </div>
                                </div>
                            </div>
                            <div className='justify-self-end'>
                                <p className="text-lg font-bold text-green-700">{formattedPrice}</p>
                            </div>
                        </div>
                    </Card>


                    <h3 className="font-semibold">Bill Details</h3>
                    <div className='bg-gray-100 p-3'>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span>Delivery Fee for {distance} kms</span>
                                <span>{formattedPrice}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>{discountPercentage}% Discount</span>
                                <span>-{formattedDiscount}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2">
                                <span>To Pay</span>
                                <span>{
                                    formattedFinalPrice
                                }</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                            By clicking on Make Payment you confirm that your order does not contain any illegal or contraband items. <a href="#" className="text-blue-600">View T&C</a>
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 text-lg">
                        Make Payment | {formattedFinalPrice}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}



{/* <div>
                        <Label htmlFor="instructions">Instructions for delivery partner</Label>
                        <Input id="instructions" placeholder="Add instructions (optional)" />
                    </div> */}

{/* <div>
                        <h3 className="font-semibold mb-2">Offers & Savings</h3>
                        <Button variant="outline" className="w-full justify-between">
                            Apply Coupon <ArrowRight className="h-4 w-4" />
                        </Button>
                        <div className="mt-2 p-2 bg-green-50 rounded-md">
                            <p className="text-sm text-green-600">1 benefit applied</p>
                            <p className="text-sm">{discountPercentage}% off - ₹{discountAmount} on delivery fee</p>
                        </div>
                    </div> */}