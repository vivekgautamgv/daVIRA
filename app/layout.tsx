import "./globals.css";
import "./brand.css";
import "./setups.css";
import "./brief.css";
import "./token-desk.css";
import "./decision-panel.css";
import "./probability-panel.css";
import "./trader-brief.css";
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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var theme=localStorage.getItem("davira-theme");document.documentElement.dataset.theme=theme==="dark"?"dark":"light"}catch{}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
