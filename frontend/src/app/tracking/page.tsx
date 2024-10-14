'use client'

import BackButton from "@/components/BackButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MessageSquare, Phone, RefreshCw } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from 'react'
import TimeAgo from 'react-timeago'

const trackingStatuses = [
    "Vehicle En Route",
    "Arrived at Pickup",
    "In Transit",
    "Delivered"
]

export default function TrackingPage() {
    const [currentStatus, setCurrentStatus] = useState(0)
    const [eta, setEta] = useState("15 mins")
    const [lastUpdated, setLastUpdated] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setLastUpdated(prev => prev + 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const refreshEta = () => {
        // Simulating ETA refresh
        setEta(`${Math.floor(Math.random() * 20 + 5)} mins`)
        setLastUpdated(0)
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='flex-row gap-2'>
                    <div className="flex items-center justify-between">
                        <BackButton />
                        <CardTitle className="text-2xl font-bold">Track Delivery</CardTitle>
                        <div className="w-10 h-10"></div> {/* Spacer for alignment */}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative h-64 w-full rounded-lg overflow-hidden">
                        <Image
                            src="/map.png"
                            alt="Map showing delivery route"
                            layout="fill"
                            objectFit="cover"
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold">ETA: {eta}</h3>
                            <p className="text-sm text-gray-500">Updated {" "}
                                <TimeAgo date={new Date()} />
                            </p>
                        </div>
                        <Button size="sm" variant={"outline"} onClick={refreshEta}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Tracking Status</h3>
                        <Progress value={(currentStatus + 1) * 25} className="mb-4" />
                        <p className="text-lg font-medium">{trackingStatuses[currentStatus]}</p>
                    </div>

                    <div className="flex space-x-4">
                        <Button className="flex-1" variant="outline">
                            <Phone className="h-4 w-4 mr-2" />
                            Call Driver
                        </Button>
                        <Button className="flex-1" variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Driver
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}