import "@/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import Providers from "@/context/Providers";
import { type Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";

const siteUrl =
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Teleport — local parcel delivery",
  description:
    "Choose a vehicle, review your fare, pay securely, and follow every parcel delivery from pickup to drop-off.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Send a parcel across town.",
    description: "Book, pay, and follow every delivery with Teleport.",
    type: "website",
    siteName: "Teleport",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Teleport — Send a parcel across town.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Send a parcel across town.",
    description: "Book, pay, and follow every delivery with Teleport.",
    images: ["/og.png"],
  },
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
