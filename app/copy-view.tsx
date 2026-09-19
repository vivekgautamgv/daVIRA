"use client";
import WalletLookup from "./wallet-lookup";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Terminal, { useData, money, short, Empty } from "./terminal";
import { Score, duration } from "./screener-view";
import { DataState } from "./ui";
export default function CopyResearch() {
  return (
    <Suspense
      fallback={<div className="loading-line">Loading copy research…</div>}
    >
      <Content />
    </Suspense>
  );
}
function Content() {
  const params = useSearchParams(),
    [address, setAddress] = useState(params.get("wallet") || ""),
    r = useData("screener", 20000),
    detail = useData(address ? `analysis/${address}` : null, 20000),
    d = detail.data?.data;
  const candidates = (r.data?.data || [])
    .filter((w: any) => w.analysis?.eligibility?.eligible)
    .sort(
      (a: any, b: any) =>
        (b.analysis.copy.score ?? -1) - (a.analysis.copy.score ?? -1),
    );
  return (
    <Terminal view="copy">
      <div className="screener-heading">
        <div>
          <span className="eyebrow">COPY RESEARCH / EXECUTION FIT</span>
          <h1>Profitable is only half the question.</h1>
          <p>
            Compare whether a wallet’s trading style can survive follower costs
            and delay.
          </p>
        </div>
        <Link className="button" href="/paper">
          Open paper account <ArrowUpRight size={15} />
        </Link>
      </div>
      <WalletLookup onSelect={setAddress} />
      <DataState resource={r} />
      <div className="flow-definition">
        <span className="pill">PAPER MODE</span>
        <p>
          This workspace does not send exchange orders. Copyability ranks
          execution characteristics; it does not guarantee that following a
          wallet will be profitable.
        </p>
      </div>
      <details className="notice">
        <summary>Shortlist criteria & score definitions</summary>
        <p>
          Positive reported 30-day and all-time perpetual PnL, with at least 29
          days in the month curve and 30 days in the all-time curve; fresh
          portfolio data within 1 hour. Fresh account snapshot within 1 hour; a
          covered venue with more than $100 equity; execution within 48 hours;
          at least 20 complete trades and 7 closing days; at least 60%
          profitable closing days, 50% win rate and profit factor 1.5; positive
          net PnL; closed-PnL drawdown no greater than half net profit;
          copyability ≥60 and positive PnL after 10bps extra cost per execution.
          These are research thresholds, not predictions. Closing-day drawdown
          excludes unrealized losses and is not account-equity drawdown.
          Observed history is limited to the local 30-day archive.
        </p>
      </details>
      <section className="panel">
        <div className="panel-head">
          <h2>Daily trader shortlist</h2>

          <span className="muted small">
            Choose a wallet to inspect costs and current positions
          </span>
        </div>
        <div className="table-scroll dense-table">
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Copyability</th>
                <th>Trading quality</th>
                <th>Reported 30D / all-time PnL</th>
                <th>Median holding time</th>
                <th>+10bps PnL drag</th>
                <th>Complete episodes</th>
                <th>Win rate / closing days</th>
                <th>Net PnL / closed drawdown</th>
                <th>Eligibility</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {candidates.slice(0, 40).map((w: any) => (
                <tr
                  key={w.address}
                  className={w.address === address ? "selected-row" : ""}
                >
                  <td>
                    <button
                      className="asset-pick"
                      onClick={() => setAddress(w.address)}
                    >
                      {w.name || short(w.address)}
                    </button>
                  </td>
                  <td>
                    <Score value={w.analysis.copy.score} />
                  </td>
                  <td>
                    <Score value={w.analysis.stats.score} />
                  </td>
                  <td>
                    {money(w.analysis.performance.month.pnl)}
                    <small className="cell-sub">
                      All-time {money(w.analysis.performance.allTime.pnl)}
                    </small>
                  </td>
                  <td>{duration(w.analysis.stats.medianHoldMs)}</td>
                  <td>
                    {w.analysis.copy.costDrag === null
                      ? "—"
                      : `${w.analysis.copy.costDrag.toFixed(1)}%`}
                  </td>
                  <td>{w.analysis.stats.completeTrades}</td>
                  <td>
                    {w.analysis.stats.winRate?.toFixed(1) ?? "—"}%
                    <small className="cell-sub">
                      {w.analysis.stats.profitableDays}/
                      {w.analysis.stats.activeDays} profitable days
                    </small>
                  </td>
                  <td>
                    {money(w.analysis.stats.netPnl)}
                    <small className="cell-sub">
                      Drawdown {money(w.analysis.stats.maxDrawdownUsd)}
                    </small>
                  </td>
                  <td>
                    {w.analysis.eligibility?.eligible
                      ? "Meets research criteria"
                      : w.analysis.eligibility?.reasons?.join(" · ")}
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => setAddress(w.address)}
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!candidates.length && (
          <Empty title="No wallets currently meet every shortlist criterion">
            Search a wallet above to inspect its record and exclusion reasons.
            Missing or insufficient reported history cannot qualify.
          </Empty>
        )}
      </section>
      <DataState resource={detail} />
      {d ? (
        <>
          <div className="copy-review">
            <div>
              <span className="eyebrow">INDIVIDUAL WALLET RESEARCH</span>
              <h2>
                <Link href={`/wallet/${address}`}>{short(address)} ↗</Link>
              </h2>
              <div className="notice">
                {d.eligibility?.eligible
                  ? "Meets shortlist criteria"
                  : "Not eligible for the copy shortlist"}
                <p>{d.eligibility?.reasons?.join(" · ")}</p>
              </div>
              <p>
                Reported 30D:{" "}
                {d.performance?.month
                  ? money(d.performance.month.pnl)
                  : "Unavailable"}{" "}
                · All-time:{" "}
                {d.performance?.allTime
                  ? money(d.performance.allTime.pnl)
                  : "Unavailable"}
              </p>
              <p>{d.copy.reason}</p>
              <Link className="text-link" href={`/wallet/${address}`}>
                Full wallet analysis ↗
              </Link>
              <div className="copy-factors">
                <span>
                  Holding-time fit <b>{d.copy.holdScore}/100</b>
                </span>
                <span>
                  Trading-frequency fit <b>{d.copy.speedScore}/100</b>
                </span>
                <span>
                  Evidence depth <b>{d.stats.components.evidence}/100</b>
                </span>
              </div>
            </div>
            <div className="panel research-card">
              <h3>Extra execution cost sensitivity</h3>
              <div className="stress-table">
                {d.copy.stress.map((s: any) => (
                  <div key={s.bps}>
                    <span>{s.bps} bps extra per execution</span>
                    <b className={s.netPnl >= 0 ? "positive" : "negative"}>
                      {money(s.netPnl, 2)}
                    </b>
                  </div>
                ))}
              </div>
              <small className="muted">
                Dollar PnL on this wallet’s complete observed episodes. This is
                not a return forecast for your account.
              </small>
            </div>
          </div>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Test a current position</h2>
                <p>
                  A one-time paper copy of direction, sized by you at today’s
                  quote
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Direction</th>
                    <th>Wallet notional</th>
                    <th>Wallet unrealized PnL</th>
                    <th>Venue</th>
                    <th>Paper test</th>
                  </tr>
                </thead>
                <tbody>
                  {d.positions.map((p: any) => (
                    <tr key={p.coin}>
                      <td>{p.coin}</td>
                      <td className={p.size > 0 ? "positive" : "negative"}>
                        {p.size > 0 ? "Long" : "Short"}
                      </td>
                      <td>{money(p.value, 1)}</td>
                      <td>{money(p.unrealized, 1)}</td>
                      <td>{p.dex}</td>
                      <td>
                        {p.dex === "Hyperliquid" ? (
                          <Link
                            className="button"
                            href={`/paper?coin=${encodeURIComponent(p.coin)}&side=${p.size > 0 ? "long" : "short"}&source=${address}`}
                          >
                            Simulate <ArrowUpRight size={13} />
                          </Link>
                        ) : (
                          <span className="muted small">
                            Builder paper execution later
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!d.positions.length && (
              <Empty title="No open positions in the covered venues" />
            )}
          </section>
        </>
      ) : address ? (
        <Empty
          title={
            detail.data?.queue?.error
              ? "Analysis needs another source response"
              : "Wallet analysis queued"
          }
        >
          {detail.data?.queue?.error ||
            "This wallet is prioritized. The page updates automatically when its Hyperliquid history arrives."}
        </Empty>
      ) : (
        <Empty title="Select a candidate to inspect the strategy">
          The review connects observed trading behavior, cost sensitivity and
          current positions.
        </Empty>
      )}
      <details className="methodology">
        <summary>Copyability score methodology</summary>
        <p>
          35% median holding-time fit (capped at one hour), 20% fill-frequency
          fit, 30% PnL retained under 10 bps additional cost per fill, and 15%
          evidence depth. At least five complete episodes are required.
          Maker-heavy execution, missed fills, hedges on other venues, latency
          and adverse selection can make real copying materially worse.
        </p>
      </details>
    </Terminal>
  );
}
