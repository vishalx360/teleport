import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import SigninAlert from "./SigninAlert";
import NotificationListener from "./NotificationListener";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return <SigninAlert />;
    }
    return (
        <>
            <NotificationListener />
            {children}
        </>
    );
}
