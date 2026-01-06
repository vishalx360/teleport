"use client"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package, Truck, User, Bike } from "lucide-react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

type Role = "USER" | "DRIVER"
type VehicleClass = "BIKE" | "PICKUP_TRUCK" | "TRUCK"

export default function LoginPage() {
    const router = useRouter()
    const [isSignup, setIsSignup] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [role, setRole] = useState<Role>("USER")
    const [vehicleClass, setVehicleClass] = useState<VehicleClass>("BIKE")
    const [error, setError] = useState("")
    const [loadingState, setLoadingState] = useState({
        github: false,
        google: false,
        credentials: false,
    })

    async function handleEmailPasswordSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoadingState((prev) => ({ ...prev, credentials: true }))

        try {
            if (isSignup) {
                // Sign up
                const response = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        password,
                        name: name || undefined,
                        role,
                        vehicleClass: role === "DRIVER" ? vehicleClass : undefined,
                    }),
                })

                const data = (await response.json()) as { error?: string }

                if (!response.ok) {
                    throw new Error(data.error ?? "Signup failed")
                }

                // After signup, automatically sign in
                const result = await signIn("credentials", {
                    email,
                    password,
                    callbackUrl: "/",
                    redirect: false,
                })

                if (result?.error) {
                    throw new Error(result.error)
                }

                void router.push("/")
                void router.refresh()
            } else {
                // Sign in
                const result = await signIn("credentials", {
                    email,
                    password,
                    callbackUrl: "/",
                    redirect: false,
                })

                if (result?.error) {
                    throw new Error("Invalid email or password")
                }

                void router.push("/")
                void router.refresh()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
            setLoadingState((prev) => ({ ...prev, credentials: false }))
        }
    }

    function handleProviderLogin(provider: string) {
        setLoadingState((prev) => ({ ...prev, [provider]: true }));
        void signIn(provider, { callbackUrl: "/" });
        setTimeout(() => {
            setLoadingState((prev) => ({ ...prev, [provider]: false }));
        }, 5000);
    }

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
                    <div className="mx-auto flex w-full flex-col justify-center space-y-5 sm:w-[350px]">
                        {/* Email/Password Form */}
                        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
                            {isSignup && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name (optional)</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={loadingState.credentials}
                                        />
                                    </div>

                                    {/* Role Selection */}
                                    <div className="space-y-2">
                                        <Label>I want to</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRole("USER")}
                                                disabled={loadingState.credentials}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${role === "USER"
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                            >
                                                <User className="h-5 w-5" />
                                                <span className="font-medium">Send packages</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRole("DRIVER")}
                                                disabled={loadingState.credentials}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${role === "DRIVER"
                                                        ? "border-primary bg-primary/5 text-primary"
                                                        : "border-gray-200 hover:border-gray-300"
                                                    }`}
                                            >
                                                <Truck className="h-5 w-5" />
                                                <span className="font-medium">Be a driver</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Vehicle Class (only for drivers) */}
                                    {role === "DRIVER" && (
                                        <div className="space-y-2">
                                            <Label>Vehicle type</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setVehicleClass("BIKE")}
                                                    disabled={loadingState.credentials}
                                                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${vehicleClass === "BIKE"
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-gray-200 hover:border-gray-300"
                                                        }`}
                                                >
                                                    <Bike className="h-5 w-5" />
                                                    <span className="text-xs font-medium">Bike</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setVehicleClass("PICKUP_TRUCK")}
                                                    disabled={loadingState.credentials}
                                                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${vehicleClass === "PICKUP_TRUCK"
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-gray-200 hover:border-gray-300"
                                                        }`}
                                                >
                                                    <Truck className="h-4 w-4" />
                                                    <span className="text-xs font-medium">Pickup</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setVehicleClass("TRUCK")}
                                                    disabled={loadingState.credentials}
                                                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all ${vehicleClass === "TRUCK"
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-gray-200 hover:border-gray-300"
                                                        }`}
                                                >
                                                    <Truck className="h-6 w-6" />
                                                    <span className="text-xs font-medium">Truck</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loadingState.credentials}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={isSignup ? "At least 6 characters" : "Your password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={isSignup ? 6 : undefined}
                                    disabled={loadingState.credentials}
                                />
                            </div>
                            {error && (
                                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loadingState.credentials}
                            >
                                {loadingState.credentials
                                    ? "Please wait..."
                                    : isSignup
                                        ? "Sign up"
                                        : "Sign in"}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* OAuth Providers */}
                        <Button
                            variant="outline"
                            onClick={() => handleProviderLogin("google")}
                            type="button"
                            disabled={loadingState.google || loadingState.credentials}
                            className="w-full"
                        >
                            {loadingState.google ? (
                                "Loading..."
                            ) : (
                                <>
                                    <Icons.google className="mr-2 h-4 w-4" />
                                    Continue with Google
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleProviderLogin("github")}
                            type="button"
                            disabled={loadingState.github || loadingState.credentials}
                            className="w-full"
                        >
                            {loadingState.github ? (
                                "Loading..."
                            ) : (
                                <>
                                    <Icons.gitHub className="mr-2 h-4 w-4" />
                                    Continue with Github
                                </>
                            )}
                        </Button>

                        {/* Toggle between sign in and sign up */}
                        <div className="text-center text-sm">
                            {isSignup ? (
                                <>
                                    Already have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignup(false)
                                            setError("")
                                        }}
                                        className="underline underline-offset-4 hover:text-primary"
                                    >
                                        Sign in
                                    </button>
                                </>
                            ) : (
                                <>
                                    Don&apos;t have an account?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignup(true)
                                            setError("")
                                        }}
                                        className="underline underline-offset-4 hover:text-primary"
                                    >
                                        Sign up
                                    </button>
                                </>
                            )}
                        </div>

                        <p className="px-8 text-center text-sm text-muted-foreground">
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