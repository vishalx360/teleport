"use client";

import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "@/trpc/react";
import ProgressBarProvider from "./ProgressBarProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <ProgressBarProvider>
        <SessionProvider>
          {children}
        </SessionProvider>
      </ProgressBarProvider>
    </TRPCReactProvider>
  );
}
