import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "daVIRA — Wallet & Market Intelligence",
  description:
    "Independent Hyperliquid market research, wallet analysis, alerts and paper trading.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
