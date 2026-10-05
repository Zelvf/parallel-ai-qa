import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PARALLEL — AI browser testing lab",
  description: "Explore, reproduce, and explain web app failures with real browsers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
