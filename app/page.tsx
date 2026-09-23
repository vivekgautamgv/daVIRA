import type { Metadata } from "next";
import Landing from "./landing";
export const metadata: Metadata = {
  title: "daVIRA — Read the money. Build your edge.",
  description:
    "Smart money intelligence for independent traders. Research Hyperliquid wallets, understand coin positioning, follow trade activity and develop your strategy with daVIRA.",
};
export default function Home() {
  return <Landing />;
}
