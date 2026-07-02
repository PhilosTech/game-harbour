import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { PwaProvider } from "@/components/shared/pwa-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const BASE_URL = "https://game-harbour-virid.vercel.app";

export const metadata: Metadata = {
  title: "Game Harbour",
  description: "A harbour for narrative games with a professional host",
  metadataBase: new URL(BASE_URL),
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Game Harbour",
    title: "Game Harbour",
    description: "A harbour for narrative games with a professional host",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Game Harbour" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Harbour",
    description: "A harbour for narrative games with a professional host",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Game Harbour",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased" suppressHydrationWarning>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
