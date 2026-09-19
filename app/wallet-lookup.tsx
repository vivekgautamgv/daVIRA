"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate, useAction, Feedback } from "./ui";
export default function WalletLookup({
  onSelect,
}: {
  onSelect?: (address: string) => void;
}) {
  const [address, setAddress] = useState(""),
    router = useRouter(),
    action = useAction();
  return (
    <section className="panel research-card">
      <h2>Look up any Hyperliquid wallet</h2>
      <p>
        Paste an address to fetch its public account and prioritize execution
        and performance analysis. It does not need to appear on the leaderboard.
      </p>
      <form
        className="inline"
        onSubmit={(e) => {
          e.preventDefault();
          const value = address.trim().toLowerCase();
          action.run(async () => {
            if (!/^0x[0-9a-f]{40}$/.test(value))
              throw Error(
                "Enter a complete 0x wallet address (42 characters).",
              );
            await mutate("analyze", { address: value });
            if (onSelect) onSelect(value);
            else router.push(`/wallet/${value}`);
          }, "Wallet requested. Analysis updates as the indexer completes.");
        }}
      >
        <input
          aria-label="Hyperliquid wallet address"
          placeholder="0x… wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="button primary" disabled={action.busy}>
          {action.busy ? "Requesting…" : "Fetch & analyze wallet"}
        </button>
      </form>
      <Feedback action={action} />
      <small className="muted">
        Public data only. Copy eligibility is checked separately; fetching a
        wallet does not endorse it.
      </small>
    </section>
  );
}
