import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import SigninAlert from "./SigninAlert";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return <SigninAlert />;
    }
    return (
        <>
            {children}
        </>
    );
}
