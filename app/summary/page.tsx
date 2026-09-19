"use client";
import { useState } from "react";
import Link from "next/link";
import Terminal, { useData, money, Empty } from "../terminal";
import { DataState, time } from "../ui";
export default function Summary() {
  const [window, setWindow] = useState("24h"),
    [coin, setCoin] = useState(""), [query, setQuery] = useState("");
  const r = useData(`flows?window=${window}&cohort=all`, 30000);
  const rows = r.data?.data || [],
    selected = rows.find((c: any) => c.coin === coin) || rows[0];
  const counts = (label: string) =>
    rows.filter((c: any) => c.marketRead?.action === label).length;
  const directional = rows.filter((c: any) =>
    ["Long bias", "Short bias"].includes(c.marketRead?.action),
  );
  const stance =
    directional.length < 3
      ? "Wait for broader evidence"
      : counts("Long bias") > counts("Short bias") * 2
        ? "Observed positioning leans long"
        : counts("Short bias") > counts("Long bias") * 2
          ? "Observed positioning leans short"
          : "Mixed positioning";
  return (
    <Terminal view="summary">
      <div className="screener-heading">
        <div>
          <span className="eyebrow">MARKET BRIEF / POSITIONING COMPASS v1</span>
          <h1>{stance}</h1>
          <p>
            A research stance for each coin, grounded in who is trading and how
            exposure changes.
          </p>
        </div>
        <div className="tabs">
          {["6h", "24h"].map((w) => (
            <button
              className={window === w ? "selected" : ""}
              key={w}
              onClick={() => setWindow(w)}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <DataState resource={r} />
      <div className="stats">
        {["Long bias", "Short bias", "Hold / neutral", "Wait"].map((label) => (
          <div className="panel research-card" key={label}>
            <span>{label}</span>
            <h2>{counts(label)} coins</h2>
          </div>
        ))}
      </div>
      <p className="notice">
        This summarizes the indexed Hyperliquid sample, not the whole market.
        Scores describe positioning, not return probabilities. Wait overrides
        the directional score when evidence fails. Position flows are not
        collateral deposits.
      </p>
      <section className="panel">
        <div className="panel-head">
          <h2>Coin decision board</h2>
          <span>
            {r.data?.coverage?.wallets || 0} contributing wallets · {window}
          </span>
        </div>
        <div className="panel-foot"><input aria-label="Search summary coins" placeholder="Find BTC, ETH, xyz:TSLA…" value={query} onChange={e=>setQuery(e.target.value)} /></div><div className="table-scroll" style={{maxHeight:480,overflow:"auto"}}>
          <table>
            <thead>
              <tr>
                <th>Coin</th>
                <th>Research stance</th>
                <th>Direction /100</th>
                <th>Evidence /100</th>
                <th>Position inflow</th>
                <th>Position outflow</th>
                <th>Qualified / observed wallets</th>
                <th>Top wallet share</th>
                <th>Last execution</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((c:any)=>c.coin.toLowerCase().includes(query.trim().toLowerCase())).map((c: any) => (
                <tr
                  key={c.coin}
                  className={selected?.coin === c.coin ? "selected-row" : ""}
                >
                  <td>
                    <button
                      className="text-link"
                      onClick={() => {setCoin(c.coin);document.getElementById("coin-brief")?.scrollIntoView({behavior:"smooth",block:"nearest"});}}
                    >
                      {c.coin}
                    </button>
                  </td>
                  <td>{c.marketRead?.action}</td>
                  <td>{c.marketRead?.score ?? "—"}</td>
                  <td>{c.marketRead?.confidence ?? 0}</td>
                  <td>{money(c.inflow)}</td>
                  <td>{money(c.outflow)}</td>
                  <td>
                    {c.marketRead?.qualified} / {c.wallets}
                  </td>
                  <td>{c.marketRead?.topShare.toFixed(0)}%</td>
                  <td>{time(c.marketRead?.latest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty title="Waiting for execution evidence">
            The collector needs indexed wallet history to create a market brief.
          </Empty>
        )}
      </section>
      {selected?.marketRead && (
        <section id="coin-brief" className="panel research-card">
          <span className="eyebrow">WHY THIS STANCE / {selected.coin}</span>
          <h2>{selected.marketRead.action}</h2>
          <p>{selected.marketRead.explanation}</p>
          <ul>
            {selected.marketRead.reasons.map((reason: string) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="stats">
            {[
              ["New-position balance", selected.marketRead.entryBalance, "45%"],
              ["Token-specialist vote", selected.marketRead.qualityVote, "35%"],
              [
                "All execution balance",
                selected.marketRead.executionBalance,
                "20%",
              ],
            ].map(([name, value, weight]: any) => (
              <div key={name}>
                <h3>{(value * 100).toFixed(0)}%</h3>
                <p>
                  {name} · weight {weight}
                </p>
              </div>
            ))}
          </div>
          <div className="inline">
            <Link
              className="button"
              href={`/flows?coin=${encodeURIComponent(selected.coin)}`}
            >
              Inspect source wallets ↗
            </Link>
            <Link
              className="button"
              href={`/coins?coin=${encodeURIComponent(selected.coin)}`}
            >
              Token track records ↗
            </Link>
          </div>
        </section>
      )}
      <details className="panel research-card">
        <summary>Scoring formula, gates and limitations</summary>
        <p>
          Direction = 50 + 50 × (45% new long-minus-short opening balance + 35%
          quality-weighted wallet vote + 20% buy-minus-sell execution balance).
          Each component lies between −1 and +1. A specialist needs token
          quality ≥60, positive token PnL, ≥10 complete episodes, ≥3 closing
          days and analysis within one hour. Each wallet gets one bounded
          quality-weighted vote; account ownership may overlap.
        </p>
        <p>
          Long bias ≥65; short bias ≤35; otherwise neutral. All stances require
          ≥5 wallets, ≥3 specialists, top activity share ≤60%, ≥70% fresh
          analyses, execution within two hours, ≥$10K opening notional, and no
          material entry/specialist disagreement. Evidence score weights wallet
          breadth 35%, specialist count 30%, concentration 20% and freshness
          15%. It is not calibrated confidence.
        </p>
        <p>
          The market heading counts coins equally and needs at least three
          directional coins. A greater than 2:1 count gives a directional
          heading. Crypto and builder instruments can be correlated. History is
          sampled, incomplete and uses current wallet selection. No backtested
          predictive edge is claimed; funding, price levels and other venues may
          invalidate the read.
        </p>
      </details>
    </Terminal>
  );
}
