import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import SigninAlert from "./SigninAlert";
import PusherListener from "./PusherListener";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return <SigninAlert />;
    }
    return (
        <>
            <PusherListener />
            {children}
        </>
    );
}
