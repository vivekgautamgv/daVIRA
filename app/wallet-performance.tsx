"use client";
import { useState } from "react";
import { useData, money, Stat } from "./terminal";
import { DataState, time, download } from "./ui";
import WalletAttribution from "./wallet-attribution";

export default function WalletPerformance({
  address,
  analysis,
}: {
  address: string;
  analysis: any;
}) {
  const [days, setDays] = useState(30),
    [coin, setCoin] = useState("");
  const r = useData(
      `performance/${address}?days=${days}&coin=${encodeURIComponent(coin)}`,
      30000,
    ),
    d = r.data;
  const max = Math.max(
    1,
    ...(d?.daily || []).map((x: any) => Math.abs(x.pnl || 0)),
  );
  return (
    <>
      <section className="panel research-card">
        <div className="screener-heading">
          <div>
            <span className="eyebrow">V2 / WALLET PERFORMANCE LAB</span>
            <h2>Where does this wallet's edge come from?</h2>
            <p>
              Compare tokens, trading direction and daily consistency within the
              retained history.
            </p>
          </div>
          <div className="tabs">
            {[7, 30].map((n) => (
              <button
                key={n}
                className={days === n ? "selected" : ""}
                onClick={() => setDays(n)}
              >
                {n}D
              </button>
            ))}
          </div>
        </div>
        <div className="brief-filters">
          <select
            aria-label="Performance coin"
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
          >
            <option value="">All coins</option>
            {analysis.coins.map((c: any) => (
              <option key={c.coin} value={c.coin}>
                {c.coin}
              </option>
            ))}
          </select>
          <button
            className="button"
            disabled={!d || r.loading || !!r.error}
            onClick={() =>
              download(
                `davira-performance-${address}-${days}d.json`,
                JSON.stringify(d, null, 2),
                "application/json",
              )
            }
          >
            Export this analysis
          </button>
        </div>
        <DataState
          resource={{ ...r, data: r.data ? { ...r.data, stale: false } : null }}
        />
        {d?.stale && (
          <p className="notice">
            The fill snapshot is older than one hour or has no verified source
            timestamp. Results describe retained history; a refresh may change
            them.
          </p>
        )}
        {d && (
          <>
            <div className="brief-strip">
              <span>
                Requested window: {time(d.start)} → {time(d.end)}
              </span>
              <span>Source fetched {time(d.sourceAt)}</span>
            </div>
            {(d.capped ||
              !d.coverage.historyReachesStart ||
              d.coverage.gaps > 0) && (
              <p className="notice">
                Limited history:{" "}
                {d.capped
                  ? "the latest source response reached the fill cap. "
                  : ""}
                {!d.coverage.historyReachesStart
                  ? "The retained executions do not reach the window start. "
                  : ""}
                {d.coverage.gaps > 0
                  ? `${d.coverage.gaps} position discontinuities detected in the retained reconstruction.`
                  : ""}
              </p>
            )}
            <div className="stats">
              <Stat
                label="Realized before fees"
                value={d.stats.fills ? money(d.stats.grossRealized, 2) : "—"}
                detail={`${d.stats.fills} observed executions`}
              />
              <Stat
                label="Recorded execution fees"
                value={d.stats.fills ? money(d.stats.fees, 2) : "—"}
                detail="Negative fees represent rebates"
              />
              <Stat
                label="Realized after fees"
                value={d.stats.fills ? money(d.stats.samplePnl, 2) : "—"}
                detail="Funding and unrealized PnL excluded"
              />
              <Stat
                label="Profitable closing days"
                value={`${d.stats.profitableDays} / ${d.stats.activeDays}`}
                detail="Complete episodes only"
              />
            </div>
            <h3>Daily realized PnL · UTC</h3>
            <div className="pnl-calendar">
              {d.daily.map((day: any) => (
                <div
                  className={`pnl-day ${day.pnl == null ? "missing" : day.pnl >= 0 ? "gain" : "loss"}`}
                  key={day.day}
                  title={`${day.day}: ${day.pnl == null ? "No observed executions" : money(day.pnl, 2)} · ${day.fills} fills`}
                >
                  <span>{day.day.slice(5)}</span>
                  <div className="pnl-stem">
                    <i
                      style={{
                        height: `${day.pnl == null ? 0 : Math.max(2, (Math.abs(day.pnl) / max) * 42)}px`,
                      }}
                    />
                  </div>
                  <strong>{day.pnl == null ? "—" : money(day.pnl)}</strong>
                </div>
              ))}
            </div>
            <p className="brief-caption">
              Dashes indicate no observed executions, not confirmed zero PnL.
              First and last UTC dates may be partial days. Bars share one
              absolute scale within this view.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Completed trade direction</th>
                    <th>Net episode PnL</th>
                    <th>Complete trades</th>
                    <th>Win rate</th>
                    <th>Profit factor</th>
                    <th>Closed-PnL drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sides.map((s: any) => (
                    <tr key={s.side}>
                      <td>{s.side}</td>
                      <td className={s.netPnl >= 0 ? "positive" : "negative"}>
                        {s.completeTrades ? money(s.netPnl, 2) : "—"}
                      </td>
                      <td>{s.completeTrades}</td>
                      <td>
                        {s.winRate == null ? "—" : `${s.winRate.toFixed(1)}%`}
                      </td>
                      <td>
                        {s.profitFactor == null
                          ? s.noLosses
                            ? "No losing episodes"
                            : "—"
                          : s.profitFactor.toFixed(2)}
                      </td>
                      <td>
                        {s.completeTrades ? money(s.maxDrawdownUsd, 2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="brief-caption">
              {d.note}{" "}
              {d.coverage.excludedFills > 0
                ? `${d.coverage.excludedFills} unsupported or invalid fills excluded in this window.`
                : ""}
            </p>
          </>
        )}
      </section>
      {d && (
        <WalletAttribution
          analysis={{
            coins: d.coins,
            fillsFetchedAt: d.sourceAt,
            period: days,
          }}
        />
      )}
    </>
  );
}
