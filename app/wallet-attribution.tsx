"use client";
import { useState } from "react";
import Link from "next/link";
import { walletAttribution } from "../lib/wallet-attribution.mjs";
import { money, Empty } from "./terminal";
import { time } from "./ui";

export default function WalletAttribution({ analysis: d }: { analysis: any }) {
  const [group, setGroup] = useState("coin"),
    [sort, setSort] = useState("profit"),
    [query, setQuery] = useState("");
  const a = walletAttribution(d.coins, group);
  const rows = a.rows
    .filter((r: any) =>
      `${r.name} ${r.coins.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((x: any, y: any) =>
      sort === "loss"
        ? x.pnl - y.pnl
        : sort === "turnover"
          ? y.turnover - x.turnover
          : y.pnl - x.pnl,
    );
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">WHERE THIS WALLET MAKES MONEY</span>
          <h2>PnL by coin & asset type</h2>
          <p>
            Observed executions in the requested {d.period || 30}-day window ·
            history may be incomplete
          </p>
        </div>
        <div className="tabs">
          {[
            ["coin", "By coin"],
            ["class", "By asset type"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={group === value ? "selected" : ""}
              onClick={() => setGroup(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="research-card">
        <div className="brief-flow-grid">
          <div>
            <span>Profitable {group === "coin" ? "coins" : "asset types"}</span>
            <strong className="positive">{money(a.positive, 2)}</strong>
          </div>
          <div>
            <span>Losing {group === "coin" ? "coins" : "asset types"}</span>
            <strong className="negative">−{money(a.negative, 2)}</strong>
          </div>
          <div>
            <span>Net realized less fees</span>
            <strong className={a.net >= 0 ? "positive" : "negative"}>
              {money(a.net, 2)}
            </strong>
          </div>
          <div>
            <span>Executions retrieved</span>
            <strong style={{ fontSize: "1rem" }}>
              {time(d.fillsFetchedAt)}
            </strong>
          </div>
        </div>
        <p className="brief-caption">
          Realized PnL includes partial exits, less recorded execution fees.
          Funding and open-position PnL are excluded. Complete-episode PnL only
          includes trades reconstructed from flat to flat; incomplete histories
          can materially change the result.
        </p>
      </div>
      <div className="panel-foot brief-filters">
        <input
          aria-label="Search wallet PnL coins"
          placeholder="Find BTC, ETH, an asset type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Sort wallet PnL"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="profit">Largest profit first</option>
          <option value="loss">Largest loss first</option>
          <option value="turnover">Highest turnover first</option>
        </select>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{group === "coin" ? "Coin" : "Asset type"}</th>
              <th>Realized − fees</th>
              <th>Share of {"profit / loss"}</th>
              <th>Complete-episode PnL</th>
              <th>Complete / partial episodes</th>
              <th>Fills / turnover</th>
              <th>Research</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.name}>
                <td>
                  <strong>{r.name}</strong>
                  {group === "class" && (
                    <small className="brief-sub">{r.coins.join(", ")}</small>
                  )}
                </td>
                <td className={r.pnl >= 0 ? "positive" : "negative"}>
                  {money(r.pnl, 2)}
                </td>
                <td>
                  {r.contribution.toFixed(1)}%
                  <small className="brief-sub">
                    {r.pnl > 0
                      ? "of profitable groups"
                      : r.pnl < 0
                        ? "of losing groups"
                        : "No contribution"}
                  </small>
                  <div className="brief-bar">
                    <span
                      style={{
                        width: `${r.contribution}%`,
                        background:
                          r.pnl >= 0 ? "var(--positive)" : "var(--negative)",
                      }}
                    />
                  </div>
                </td>
                <td>{r.completeTrades ? money(r.completePnl, 2) : "—"}</td>
                <td>
                  {r.completeTrades} / {r.partialTrades}
                  <small className="brief-sub">
                    {r.completeTrades < 10
                      ? "Thin complete-trade sample"
                      : "Inspect consistency and risk"}
                  </small>
                </td>
                <td>
                  {r.fills} / {money(r.turnover)}
                </td>
                <td>
                  {group === "coin" ? (
                    <Link
                      className="text-link"
                      href={`/coins?coin=${encodeURIComponent(r.name)}`}
                    >
                      Token research ↗
                    </Link>
                  ) : (
                    `${r.coins.length} instruments`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Empty title="No matching coin PnL">
          Only coins with observed execution PnL appear here.
        </Empty>
      )}
      <div className="panel-foot">
        Grouping can offset winners against losers within an asset type.
        Contribution uses separate positive and negative totals, so a near-zero
        net PnL never creates misleading percentages. Profit alone does not
        establish specialist skill.
      </div>
    </section>
  );
}
