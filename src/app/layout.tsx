import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCHIVE_7 // node09",
  description:
    "Unstable archival console. Sector integrity compromised. Rebuild in progress.",
  applicationName: "ARCHIVE_7",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARCHIVE_7",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
