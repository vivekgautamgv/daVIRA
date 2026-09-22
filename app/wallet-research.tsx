"use client";
import ReportedPerformance from "./reported-performance";
import Link from "next/link";
import { useData, Empty, money, num, pct } from "./terminal";
import { Score, duration } from "./screener-view";
import { DataState, time, useAction, Feedback, mutate } from "./ui";
export default function WalletResearch({ address }: { address: string }) {
  const r = useData(`analysis/${address}`, 15000),
    action = useAction(),
    d = r.data?.data;
  return (
    <>
      {d && <ReportedPerformance analysis={d} />}
      {d?.evidence && (
        <section className="panel research-card">
          <span className="eyebrow">SOURCE & HISTORY EVIDENCE</span>
          <h2>{d.evidence.status}</h2>
          <p>
            Hyperliquid public execution history · retrieved{" "}
            {time(d.evidence.fetchedAt)} · analysis version {d.analyticsVersion}
          </p>
          <div className="evidence-checks">
            {d.evidence.checks.map((c: any) => (
              <div key={c.label}>
                <span className={c.pass ? "positive" : "muted"}>
                  {c.pass ? "Pass" : "Review"}
                </span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
          <p className="muted">
            Observed executions: {time(d.evidence.first)} to{" "}
            {time(d.evidence.last)}. {d.evidence.scope}
          </p>
          <details>
            <summary>Daily reported PnL observations</summary>
            {d.dailyHistory?.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>UTC date</th>
                      <th>Universe rank</th>
                      <th>Reported 30D PnL</th>
                      <th>Reported equity</th>
                      <th>Source time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.dailyHistory.map((h: any) => (
                      <tr key={h.day}>
                        <td>{h.day}</td>
                        <td>#{h.rank}</td>
                        <td>{money(h.pnl30d)}</td>
                        <td>{h.equity == null ? "—" : money(h.equity)}</td>
                        <td>{time(h.sourceAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                No daily observations for this address yet. Unobserved days are
                not reconstructed.
              </p>
            )}
          </details>
          <details>
            <summary>Pre-move research · methodology pending</summary>
            <p>
              Reserved for historical positioning before large moves. Future
              results will include entry timestamps, comparison windows,
              repeatability and false positives.
            </p>
          </details>
        </section>
      )}
      <section className="panel analysis-header">
        <div className="panel-head">
          <div>
            <span className="eyebrow">DEEP WALLET RESEARCH</span>
            <h2>Trading quality, specialization & copyability</h2>
          </div>
          <Link className="text-link" href="/discover">
            Compare in screener →
          </Link>
        </div>
        <DataState resource={r} />
        <Feedback action={action} />
        {!d ? (
          <Empty
            title={
              r.data?.queue?.error
                ? "Analysis temporarily unavailable"
                : "Analyzing this wallet’s execution history"
            }
          >
            {r.data?.queue?.error ||
              "This address is prioritized in the research queue. Results include reconstructed position episodes and selected builder DEX exposure."}
          </Empty>
        ) : (
          <>
            <div className="analysis-scoreboard">
              <div>
                <span>Trading quality</span>
                <Score value={d.stats.score} />
                <small>{d.stats.confidence}</small>
              </div>
              <div>
                <span>Copyability</span>
                <Score value={d.copy.score} label="Copyability" />
                <small>{d.copy.grade}</small>
              </div>
              <div>
                <span>Complete episodes</span>
                <strong>{d.stats.completeTrades}</strong>
                <small>{d.stats.partialTrades} partial episodes excluded</small>
              </div>
              <div>
                <span>Episode win rate</span>
                <strong>
                  {d.stats.winRate === null
                    ? "—"
                    : `${d.stats.winRate.toFixed(1)}%`}
                </strong>
                <small>After execution fees; before funding</small>
              </div>
              <div>
                <span>Median holding time</span>
                <strong>{duration(d.stats.medianHoldMs)}</strong>
                <small>Complete position episodes</small>
              </div>
              <div>
                <span>RWA turnover share</span>
                <strong>{d.rwa.share.toFixed(1)}%</strong>
                <small>Equity, index, commodity & FX</small>
              </div>
            </div>
            <div className="score-explanation">
              {Object.entries(d.stats.components).map(([k, v]: any) => (
                <div key={k}>
                  <span>
                    {
                      (
                        {
                          profitability: "Profitability",
                          consistency: "Profitable days",
                          drawdownControl: "Drawdown control",
                          evidence: "Sample depth",
                        } as any
                      )[k]
                    }
                  </span>
                  <div>
                    <i style={{ width: `${v}%` }} />
                  </div>
                  <b>{v}/100</b>
                </div>
              ))}
            </div>
            <div className="panel-foot">
              Analyzed {time(d.updatedAt)} · {num(d.indexedFills)} indexed fills
              · {d.coverage.gaps} detected position discontinuities
            </div>
          </>
        )}
      </section>
      {d && (
        <>
          <div className="two-columns">
            <section className="panel research-card">
              <h2>Copying stress test</h2>
              <p>{d.copy.reason}</p>
              <div className="stress-table">
                {d.copy.stress.map((s: any) => (
                  <div key={s.bps}>
                    <span>
                      {s.bps === 0
                        ? "Recorded episode PnL"
                        : `+${s.bps} bps per execution`}
                    </span>
                    <b className={s.netPnl >= 0 ? "positive" : "negative"}>
                      {money(s.netPnl, 2)}
                    </b>
                  </div>
                ))}
              </div>
              <p className="muted small">
                Applies extra cost to the notional of complete episodes. This is
                a cost sensitivity calculation, not a follower backtest. It
                excludes latency, funding, liquidity impact and missed fills.
              </p>
              <Link className="text-link" href={`/copy?wallet=${address}`}>
                Open copy research →
              </Link>
            </section>
            <section className="panel research-card">
              <h2>Risk & execution profile</h2>
              <dl className="facts">
                <div>
                  <dt>Main exposure / equity</dt>
                  <dd>
                    {d.risk.exposureMultiple === null
                      ? "—"
                      : `${d.risk.exposureMultiple.toFixed(2)}×`}
                  </dd>
                </div>
                <div>
                  <dt>Largest position share</dt>
                  <dd>{d.risk.concentration.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>Maker notional share</dt>
                  <dd>{d.stats.makerShare.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>Estimated fills / observed day</dt>
                  <dd>{d.stats.fillFrequency.toFixed(1)}</dd>
                </div>
                <div>
                  <dt>Closed-PnL max drawdown</dt>
                  <dd>{money(d.stats.maxDrawdownUsd, 2)}</dd>
                </div>
                <div>
                  <dt>Profit factor</dt>
                  <dd>
                    {d.stats.profitFactor === null
                      ? d.stats.noLosses
                        ? "No losing episodes"
                        : "Unavailable"
                      : d.stats.profitFactor.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Performance by coin</h2>
                <p>Identify what this wallet actually trades well</p>
              </div>
              <span className="pill">INDEXED 30D SAMPLE</span>
            </div>
            <div className="table-scroll dense-table">
              <table>
                <thead>
                  <tr>
                    <th>Coin / instrument</th>
                    <th>Asset class</th>
                    <th>Turnover share</th>
                    <th>Sample realized − fees</th>
                    <th>Complete episodes</th>
                    <th>Episode win rate</th>
                    <th>Quality /100</th>
                    <th>Median hold</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.coins.map((c: any) => (
                    <tr key={c.coin}>
                      <td>{c.coin}</td>
                      <td>{c.class}</td>
                      <td>{c.volumeShare.toFixed(1)}%</td>
                      <td
                        className={c.samplePnl >= 0 ? "positive" : "negative"}
                      >
                        {money(c.samplePnl, 2)}
                      </td>
                      <td>{c.completeTrades}</td>
                      <td>
                        {c.winRate === null ? "—" : `${c.winRate.toFixed(1)}%`}
                      </td>
                      <td>
                        <Score value={c.score} />
                      </td>
                      <td>{duration(c.medianHoldMs)}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/flows?coin=${encodeURIComponent(c.coin)}`}
                        >
                          Coin flows →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>RWA & builder DEX exposure</h2>
                <p>
                  Current selected builder positions, alongside classified main
                  DEX commodities
                </p>
              </div>
            </div>
            <div className="table-scroll dense-table">
              <table>
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Class</th>
                    <th>Venue</th>
                    <th>Direction</th>
                    <th>Position notional</th>
                    <th>Unrealized PnL</th>
                    <th>Leverage</th>
                  </tr>
                </thead>
                <tbody>
                  {d.positions
                    .filter(
                      (p: any) =>
                        p.dex !== "Hyperliquid" ||
                        ["Commodity", "Equity", "Index", "FX"].includes(
                          p.class,
                        ),
                    )
                    .map((p: any) => (
                      <tr key={p.coin}>
                        <td>{p.coin}</td>
                        <td>{p.class}</td>
                        <td>{p.dex}</td>
                        <td className={p.size > 0 ? "positive" : "negative"}>
                          {p.size > 0 ? "Long" : "Short"}
                        </td>
                        <td>{money(p.value)}</td>
                        <td>{money(p.unrealized)}</td>
                        <td>{p.leverage}×</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!d.positions.some(
                (p: any) =>
                  p.dex !== "Hyperliquid" ||
                  ["Commodity", "Equity", "Index", "FX"].includes(p.class),
              ) && (
                <Empty title="No classified RWA or builder position observed">
                  This is the current snapshot, not proof that the wallet never
                  trades these markets.
                </Empty>
              )}
            </div>
            <div className="panel-foot">
              Builder coverage:{" "}
              {d.builderCoverage
                .map(
                  (s: any) =>
                    `${s.dex}: ${s.available ? (s.stale ? "cached" : "available") : "unavailable"}`,
                )
                .join(" · ")}{" "}
              {d.builderError || ""}. Derivative exposure does not mean
              ownership of the underlying asset.
            </div>
          </section>
          <details className="methodology">
            <summary>Episode reconstruction & scoring methodology</summary>
            <p>{d.coverage.scope}</p>
            <p>
              A trade episode runs from flat to flat; a reversal closes one
              episode and opens another. Partial exits stay in the same episode.
              Missing openings and inconsistent position sequences are excluded
              from quality metrics. At least five complete episodes are required
              for a score. Quality: 35% capped profit factor, 25% profitable
              closing days, 25% closed-PnL drawdown control, 15% sample depth.
            </p>
          </details>
        </>
      )}
    </>
  );
}
