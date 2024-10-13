"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"
import { useState } from "react"
import { Icons } from "@/components/icons"

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState<boolean>(false)

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="max-w-md mx-auto">
                <CardHeader className='text-center gap-2'>
                    <CardTitle className="text-3xl font-bold mt-2">
                        <Package className="h-10 w-10 inline" /> Teleport
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                        Send anything, anywhere
                    </CardDescription>
                </CardHeader>
                <CardContent className="">
                    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                        <Button variant="default"
                            className="rounded-xl flex items-center justify-center gap-3 font-bold  p-4 px-5 h-auto w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors hover:text-white"
                            type="button" disabled={isLoading}>
                            {isLoading ? (
                                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.google className="mr-2 h-4 w-4" />
                            )}{" "}
                            Continue with Google
                        </Button>                        <p className="px-8 text-center text-sm text-muted-foreground">
                            By clicking continue, you agree to our{" "}
                            <Link
                                href="/terms"
                                className="underline underline-offset-4 hover:text-primary"
                            >
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                                href="/privacy"
                                className="underline underline-offset-4 hover:text-primary"
                            >
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}