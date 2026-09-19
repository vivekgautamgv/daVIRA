"use client";
import Link from "next/link";
import { ArrowUpRight, Layers3, Users, ScanLine } from "lucide-react";
import { money, short } from "./terminal";
export default function FlowResearch({
  rows,
  coin,
  onSelect,
}: {
  rows: any[];
  coin: string;
  onSelect: (coin: string) => void;
}) {
  const selected = rows.find((c) => c.coin === coin) || rows[0];
  if (!selected?.insight) return null;
  const s = selected.insight;
  const direction = s.directional >= 0 ? "buy" : "sell";
  return (
    <section className="flow-research panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">THE RESEARCH LAYER</span>
          <h2>What is behind the flow?</h2>
        </div>
        <span className="pill">DERIVED FROM EXECUTIONS</span>
      </div>
      {!coin && (
        <div className="research-coin-tabs">
          {rows.slice(0, 8).map((c) => (
            <button
              key={c.coin}
              onClick={() => onSelect(c.coin)}
              className={c.coin === selected.coin ? "active" : ""}
            >
              {c.coin}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </div>
      )}
      <div className="flow-thesis">
        <span className="instrument-badge">{selected.coin.slice(0, 3)}</span>
        <div>
          <h3>
            {selected.coin} · {s.behavior}
          </h3>
          <p>
            {money(Math.abs(s.directional), 1)} more {direction} than{" "}
            {direction === "buy" ? "sell" : "buy"} notional across{" "}
            {selected.wallets} observed wallets.{" "}
            {s.leaderChangesDirection
              ? "Removing the most active wallet reverses that balance."
              : s.leaderShare > 50
                ? "One wallet accounts for more than half of the activity."
                : "Inspect the wallet split before treating the total as agreement."}
          </p>
        </div>
        <span className="sample-chip">{s.evidence}</span>
      </div>
      <div className="research-grid">
        <article>
          <span>
            <Layers3 size={14} /> ENTRY OR EXIT?
          </span>
          <strong>
            {s.newLongBuyShare == null
              ? "—"
              : s.newLongBuyShare.toFixed(0) + "%"}
          </strong>
          <h3>of buys open long exposure</h3>
          <p>
            The rest closes shorts. On the sell side,{" "}
            {s.newShortSellShare == null
              ? "no activity was recorded"
              : `${s.newShortSellShare.toFixed(0)}% opens shorts`}
            . A buy print alone does not establish new conviction.
          </p>
          <div className="research-meter">
            <i style={{ width: `${s.newLongBuyShare || 0}%` }} />
          </div>
        </article>
        <article>
          <span>
            <Users size={14} /> WALLET AGREEMENT
          </span>
          <strong>
            {s.bullishWallets}
            <small>long-leaning /</small>
            {s.bearishWallets}
            <small>short-leaning</small>
          </strong>
          <h3>Each wallet gets one vote</h3>
          <p>
            Wallets are counted by their signed position-size change. Flat round
            trips have no vote. Shared positioning does not establish
            coordination or independent ownership.
          </p>
        </article>
        <article>
          <span>
            <ScanLine size={14} /> CONCENTRATION CHECK
          </span>
          <strong>
            {s.leaderShare == null ? "—" : s.leaderShare.toFixed(1) + "%"}
          </strong>
          <h3>of activity from one wallet</h3>
          <p>
            Without the most active wallet:{" "}
            <b className={s.excludingLeader >= 0 ? "positive" : "negative"}>
              {money(s.excludingLeader, 1)}
            </b>{" "}
            net buy minus sell.{" "}
            {s.leader && (
              <Link href={`/wallet/${s.leader}`}>
                Inspect {short(s.leader)} ↗
              </Link>
            )}
          </p>
        </article>
        <article>
          <span>PACE / EQUAL HALF-WINDOWS</span>
          <strong>
            {s.acceleration == null ? "—" : s.acceleration.toFixed(2) + "×"}
          </strong>
          <h3>Recent activity versus earlier activity</h3>
          <p>
            {s.acceleration == null
              ? "Baseline too thin for a ratio."
              : `Latest ${s.halfWindowHours}h versus the preceding ${s.halfWindowHours}h, using only wallets with history spanning both halves.`}{" "}
            {s.baselineCoverage.toFixed(0)}% of contributing wallets have
            archived history reaching the window start.
          </p>
        </article>
      </div>
      <div className="panel-foot">
        Research context, not a price forecast. Perpetual position notional is
        not collateral flow. Funding, other venues and unobserved history can
        change the interpretation.
      </div>
    </section>
  );
}
