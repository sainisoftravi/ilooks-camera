import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iLooks-Connect | ANYWHERE. ANYTIME.",
  description: "Enterprise multi-tenant low-latency WebRTC IP camera streaming platform",
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.png",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo-icon.png" />
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      </head>
      <body className="bg-[#070A0F] text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
