'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, UserCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession()
    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='gap-2'>
                    <div className="flex items-center justify-between">
                        <div className="">

                            <CardTitle className="text-2xl font-bold mt-2">
                                <Package className="inline" /> Teleport
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-600">
                                Send anything, anywhere
                            </CardDescription>
                        </div>


                        <div className="flex gap-4 justify-center items-center">
                            <div className="text-right">
                                <p className="font-bold">
                                    {status === "loading" ? "Loading..." : session?.user.name}
                                </p>
                                {session?.user.role && <p className="text-xs font-bold">
                                    {session?.user.role}
                                </p>}
                                <button variant={"ghost"} className="text-red-600" onClick={signOut}>
                                    Logout
                                </button>
                            </div>
                            <UserCircle />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}
