import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import DashboardPage from "./(protected)/dashboard/page";
import LoginPage from "./login/page";
import OnBoardingPage from "./(protected)/onboarding/page";

const rolePageMap = {
    "ADMIN": <DashboardPage />,
    "USER": <DashboardPage />,
    "DRIVER": <DashboardPage />,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return <LoginPage />;
    }
    if (session.user.role === null) {
        return <OnBoardingPage />
    }
    const page = rolePageMap[session.user.role];
    return page
}
