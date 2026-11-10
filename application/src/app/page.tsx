import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import LandingPage from "@/components/LandingPage";
import { redirect } from "next/navigation";

const rolePageMap = {
    "ADMIN": "/dashboard/admin",
    "USER": "/dashboard/user",
    "DRIVER": "/dashboard/driver"
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // Landing-only deployments (e.g. Vercel without backend credentials) skip the session lookup.
    if (process.env.LANDING_ONLY) {
        return <LandingPage />;
    }
    const session = await getServerSession(authOptions);
    if (!session) {
        return <LandingPage />;
    }
    if (!session.user.role) {
        redirect("/onboarding");
    }
    redirect(rolePageMap[session.user.role]);
}
