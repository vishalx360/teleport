"use client"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"

export default function LoginPage() {
    const [loadingState, setLoadingState] = useState({
        github: false,
        google: false,
    })

    function handleGithubLogin() {
        setIsLoading(true);
        signIn("github", { callbackUrl: "/" });
        // after 5 seconds, set isLoading to false
        setTimeout(() => {
            setIsLoading(false);
        }, 5000);
    }

    function handleGoogleLogin() {
        setIsLoading(true);
        signIn("google", { callbackUrl: "/" });
        // after 5 seconds, set isLoading to false
        setTimeout(() => {
            setIsLoading(false);
        }, 5000);
    }
    function handleProviderLogin(provider: string) {
        setLoadingState((prev) => ({ ...prev, [provider]: true }));
        signIn(provider, { callbackUrl: "/" });
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
                        <Button variant="outline"
                            onClick={() => { handleProviderLogin("google") }}
                            type="button" loading={loadingState.google}>
                            <Icons.google className="mr-2 h-4 w-4" />
                            Continue with Google
                        </Button>
                        <Button variant="outline"
                            onClick={() => { handleProviderLogin("github") }}
                            type="button" loading={loadingState.github}>
                            <Icons.gitHub className="mr-2 h-4 w-4" />
                            Continue with Github
                        </Button>


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