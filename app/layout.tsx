import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Townsend CSAT Driver Simulator",
  description: "Usage-aware driver importance and what-if modeling for AWS and Lab",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
