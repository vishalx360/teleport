import "@/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import Providers from "@/context/Providers";
import { type Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";



export const metadata: Metadata = {
  title: "Teleport — delivery, on your terms",
  description: "Book, track, and deliver with Teleport.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-h-screen bg-[#101114]">
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
