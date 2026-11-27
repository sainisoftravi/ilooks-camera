import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iLook | Cloud Video Surveillance & Security Platform",
  description: "Commercial multi-tenant low-latency WebRTC IP camera streaming platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
