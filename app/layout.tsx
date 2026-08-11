import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TinyShift — Healthy habits that fit your life",
  description: "Map your real day and find small food and movement changes easy enough to stick.",
  applicationName: "TinyShift",
  openGraph: {
    title: "TinyShift — Healthy habits that fit your life",
    description: "Don't rebuild your routine. Improve the one you already have.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TinyShift routine map and tiny habit suggestion" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TinyShift — Healthy habits that fit your life",
    description: "Small food and movement changes designed around your real day.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
