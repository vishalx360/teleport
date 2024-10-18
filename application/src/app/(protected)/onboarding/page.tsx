'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { userRoleIconMap, vehicles } from "@/lib/constants"
import { Package } from "lucide-react"

import { CardDescription } from "@/components/ui/card"
import { api } from "@/trpc/react"
import { ArrowRight, UserCircle } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export default function OnBoardingPage() {
    const { data: session, status, update: updateSession } = useSession()
    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='gap-2'>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold mt-2">
                            <Package className="inline" /> Teleport
                        </CardTitle>
                        <div className="flex gap-4 justify-center items-center">
                            <div className="text-right">
                                <p className="font-bold">
                                    {status === "loading" ? "Loading..." : session?.user.name}
                                </p>
                                {session?.user.role && <p className="font-bold">
                                    {session?.user.role}
                                </p>}
                                <button variant={"ghost"} className="text-red-600" onClick={signOut}>
                                    Logout
                                </button>
                            </div>
                            <UserCircle />
                        </div>
                    </div>
                    <CardDescription className="text-sm text-gray-600">
                        Send anything, anywhere
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <UserRoleSelection updateSession={updateSession} />

                </CardContent>
                <CardFooter>

                </CardFooter>
            </Card>
        </div>
    );
}

// User Role Selection Component
const UserRoles = ["USER", "DRIVER"];

const UserRoleSelection = ({ updateSession }: {
    updateSession: () => void
}) => {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState("USER");
    const [selectedVehicleClass, setSelectedVehicleClass] = useState("BIKE");

    const { isPending, mutate } = api.user.setRole.useMutation({
        onSuccess(data, variables, context) {
            toast.success(data.message);
            updateSession()
            router.push("/");
        },
        onError(error, variables, context) {
            toast.error(error.message);
        },

    });
    function handleSetRole() {
        mutate({
            role: selectedRole as any,
            vehicleClass: selectedRole === "DRIVER" ? selectedVehicleClass : undefined
        });
    }
    return (
        <div className="space-y-4">
            <h3 className="font-semibold" > Who are you ?</h3>
            {
                Array.from(UserRoles).map((role) => {
                    const RoleIcon = userRoleIconMap[role];
                    return (
                        <label key={role} className="block cursor-pointer">
                            <div
                                className={`flex items-center justify-between p-3 border rounded-lg ${selectedRole === role ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                    }`}
                                onClick={() => setSelectedRole(role)}
                            >
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="radio"
                                        name="vehicle"
                                        value={role}
                                        checked={selectedRole === role}
                                        onChange={() => setSelectedRole(role)}
                                        className="form-radio text-blue-600 hidden"
                                    />
                                    {RoleIcon}
                                    <div>
                                        <p className="font-semibold">I am a {role.toLowerCase()}</p>
                                        <p className="text-gray-500">
                                            {role === "USER" ? "Send packages" : "Deliver packages"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </label>
                    )
                })
            }

            {
                selectedRole === "DRIVER" && <VehicleSelection selectedVehicleClass={selectedVehicleClass} setSelectedVehicleClass={setSelectedVehicleClass} />
            }

            <Button
                onClick={handleSetRole}
                disabled={isPending}
                className="w-full"
            >
                <span>Continue</span>
                <ArrowRight className="inline" />
            </Button>
        </div >
    )
};


// Vehicle Selection Component
export const VehicleSelection = (
    {
        selectedVehicleClass,
        setSelectedVehicleClass
    }: {
        selectedVehicleClass: string,
        setSelectedVehicleClass: (vehicleClass: string) => void
    }
) => {

    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Select Your Vehicle</h3>
            {vehicles.map((vehicle) => {
                return (
                    <label key={vehicle.name} className="block cursor-pointer">
                        <div
                            className={`flex items-center justify-between p-3 border rounded-lg ${selectedVehicleClass === vehicle.class ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                }`}
                            onClick={() => setSelectedVehicleClass(vehicle.class)}
                        >
                            <div className="flex items-center space-x-3">
                                <input
                                    type="radio"
                                    name="vehicle"
                                    value={vehicle.class}
                                    checked={selectedVehicleClass === vehicle.class}
                                    onChange={() => setSelectedVehicleClass(vehicle.class)}
                                    className="form-radio text-blue-600 hidden"
                                />
                                <img src={vehicle.icon} alt={vehicle.name} className="h-10 w-10" />
                                <div>
                                    <h4 className="font-medium">{vehicle.name}</h4>
                                    <p className="text-sm text-gray-600">{vehicle.description}</p>
                                    <p className="text-xs text-gray-600">Dimentions: {vehicle.dimensions}</p>
                                    <p className="text-xs text-gray-600">Max Weight: {vehicle.maxWeight}</p>
                                </div>
                            </div>
                            <div className="ml-auto ">
                                <p className="font-semibold">₹{vehicle.perKmCost}/Km</p>
                            </div>
                        </div>
                    </label>
                )
            })}
        </div>
    )
};