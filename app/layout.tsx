// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrustStamp",
  description: "Securely notarize your PDF on the immutable Hedera Network",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-slate-900 antialiased`}>
        {/* Wrap your entire app inside the Convex Provider */}
        <ConvexClientProvider>
          <ServiceWorkerRegister />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
