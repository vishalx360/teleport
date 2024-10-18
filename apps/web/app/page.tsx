import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import LoginPage from "./login/page";
import { redirect } from "next/navigation";

const rolePageMap = {
    "ADMIN": "/dashboard/admin",
    "USER": "/dashboard/user",
    "DRIVER": "/dashboard/driver"
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return <LoginPage />;
    }
    if (!session.user.role) {
        redirect("/onboarding");
    }
    redirect(rolePageMap[session.user.role]);
}
