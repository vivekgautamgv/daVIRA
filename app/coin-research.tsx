"use client";
import { useState } from "react";
import Link from "next/link";
import { useData, money, short, Empty } from "./terminal";
import { DataState, time } from "./ui";
import { Score } from "./screener-view";

export default function CoinResearch({ coin }: { coin: string }) {
  const r = useData("screener", 30000),
    [qualified, setQualified] = useState(true);
  const rows = (r.data?.data || [])
    .flatMap((w: any) => {
      const c = w.analysis?.coins.find((c: any) => c.coin === coin);
      return c ? [{ ...w, token: c }] : [];
    })
    .filter(
      (w: any) =>
        !qualified ||
        (w.token.completeTrades >= 10 &&
          w.token.activeDays >= 3 &&
          w.token.netPnl > 0),
    )
    .sort(
      (a: any, b: any) =>
        (b.token.score ?? -1) - (a.token.score ?? -1) ||
        b.token.netPnl - a.token.netPnl,
    );
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="eyebrow">
            TOKEN SPECIALISTS / OBSERVED 30-DAY ARCHIVE
          </span>
          <h2>Who trades {coin} well?</h2>
          <p>
            Ranked by this token’s record, independently of the wallet’s
            performance elsewhere.
          </p>
        </div>
        <Link
          className="button"
          href={`/flows?coin=${encodeURIComponent(coin)}`}
        >
          Inspect {coin} flows ↗
        </Link>
      </div>
      <DataState resource={r} />
      <div className="panel-foot">
        <label>
          <input
            type="checkbox"
            checked={qualified}
            onChange={(e) => setQualified(e.target.checked)}
          />{" "}
          Positive token PnL · ≥10 complete trades · ≥3 closing days
        </label>
        <p>
          {r.data?.indexing?.indexed ?? 0} wallets indexed ·{" "}
          {r.data?.indexing?.queued ?? 0} queued. Rankings update as histories
          arrive.
        </p>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Wallet</th>
              <th>{coin} quality</th>
              <th>Token net PnL</th>
              <th>Win rate</th>
              <th>Profit factor</th>
              <th>Closed-PnL drawdown</th>
              <th>Complete trades / days</th>
              <th>Current activity</th>
              <th>Research</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((w: any) => (
              <tr key={w.address}>
                <td>
                  <Link href={`/wallet/${w.address}`}>
                    {w.name || short(w.address)}
                  </Link>
                  <small className="cell-sub">
                    {w.token.volumeShare.toFixed(1)}% of observed turnover
                  </small>
                </td>
                <td>
                  <Score value={w.token.score} />
                </td>
                <td className={w.token.netPnl > 0 ? "positive" : "negative"}>
                  {money(w.token.netPnl)}
                </td>
                <td>
                  {w.token.winRate == null
                    ? "—"
                    : `${w.token.winRate.toFixed(1)}%`}
                </td>
                <td>
                  {w.token.profitFactor?.toFixed(2) ??
                    (w.token.noLosses ? "No observed losses" : "—")}
                </td>
                <td>{money(w.token.maxDrawdownUsd)}</td>
                <td>
                  {w.token.completeTrades} / {w.token.activeDays}
                </td>
                <td>
                  {w.analysis.eligibility?.active
                    ? "Active / funded"
                    : "Historical record"}
                  <small className="cell-sub">
                    Indexed {time(w.analysis.updatedAt)}
                  </small>
                </td>
                <td>
                  <Link href={`/copy?wallet=${w.address}`}>Copy review ↗</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <Empty title={`No qualifying ${coin} record in the current archive`}>
          Disable the evidence filter to inspect thin samples. A missing record
          is not zero performance.
        </Empty>
      )}
      <details className="panel-foot">
        <summary>How token rankings are calculated</summary>
        <p>
          Each token is scored using only its complete flat-to-flat position
          episodes: 35% profit factor (capped at 3), 25% profitable closing-day
          share, 25% closed-PnL drawdown control, 15% evidence depth. At least
          five episodes are required for a score. Net PnL includes execution
          fees, excludes funding and unrealized PnL. Partial histories are
          excluded. Drawdown is the dollar decline in cumulative closed-trade
          PnL, not portfolio drawdown. This is an observed sample, not full
          lifetime history or a forecast.
        </p>
      </details>
    </section>
  );
}
