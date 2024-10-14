'use client'

import BackButton from '@/components/BackButton'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { vehicles } from '@/lib/constants'
import { ArrowRight, Clock } from "lucide-react"

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
    totalAmount = defaultCheckoutData.totalAmount,
    addresses = defaultCheckoutData.addresses,
    distance = defaultCheckoutData.distance,
    estimatedDeliveryTime = defaultCheckoutData.estimatedDeliveryTime,
    pickupTime = defaultCheckoutData.pickupTime,
    discountPercentage = defaultCheckoutData.discountPercentage,
    vehicle = defaultCheckoutData.vehicle
}: CheckoutProps = defaultCheckoutData) {

    const price = vehicle.perKmCost * distance
    const discount = price * (discountPercentage / 100)
    const finalPrice = price - discount

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
                            <span className="text-3xl font-bold">₹{finalPrice}</span>
                            <span className="text-green-600 font-medium">You save ₹{discount}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold">Delivery Details</h3>
                        <div className="flex gap-3 items-center ">
                            <span>
                                {addresses.pickup.location}
                            </span>
                            <ArrowRight className='w-5 h-5' />
                            <span>

                                {addresses.delivery.location}
                            </span>
                        </div>
                        <p className="text-sm">{distance} km • Est. delivery in {estimatedDeliveryTime}</p>

                    </div>
                    <Card className="p-2 px-4">
                        <div className="flex items-center justify-between gap-5">
                            <div className="flex items-center gap-5">
                                {vehicle.icon}
                                <div className=" items-center text-green-600">
                                    <span className="text-sm font-bold mr-2 text-gray-600">{vehicle.name}</span>
                                    <div className="flex items-center text-green-600">
                                        <Clock className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">Pick up in {pickupTime}</span>
                                    </div>
                                </div>
                            </div>
                            <div className='justify-self-end'>
                                <p className="text-lg font-bold text-green-700">₹{vehicle.perKmCost * distance}</p>
                            </div>
                        </div>
                    </Card>


                    <h3 className="font-semibold">Bill Details</h3>
                    <div className='bg-gray-100 p-3'>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span>Delivery Fee for {distance} kms</span>
                                <span>₹{price}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>{discountPercentage}% Discount</span>
                                <span>-₹{discount}</span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2">
                                <span>To Pay</span>
                                <span>₹{
                                    finalPrice
                                }</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                            Cancellation fee of ₹30 may apply if you cancel after delivery partner reaches pickup location. <a href="#" className="text-blue-600">Read Policy</a>
                        </p>
                        <div className="flex items-start space-x-2">
                            <Checkbox id="terms" />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="terms" className="text-sm text-gray-600">
                                    I confirm that my order does not contain any illegal or contraband items. <a href="#" className="text-blue-600">View T&C</a>
                                </Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6 text-lg">
                        Make Payment | ₹{totalAmount}
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