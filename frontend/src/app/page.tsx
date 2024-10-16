import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { redirect } from "next/navigation";
import DashboardPage from "./(protected)/dashboard/page";
import DriverDashboardPage from "./(protected)/driver-dashboard/page";
import LoginPage from "./login/page";

const rolePageMap = {
    "ADMIN": <DashboardPage />,
    "USER": <DashboardPage />,
    "DRIVER": <DriverDashboardPage />,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return <LoginPage />;
    }
    if (session.user.role === null) {
        return redirect("/onboarding");
    }
    const page = rolePageMap[session.user.role];
    return page
}
