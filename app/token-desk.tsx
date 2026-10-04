"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from "recharts";
import { useData, money, price, pct, short, Empty } from "./terminal";
import { DataState, time, download } from "./ui";
import DecisionPanel from "./decision-panel";
import ProbabilityPanel from "./probability-panel";
const fmt = (n: number | null) => (n == null ? "—" : `${n.toFixed(1)}%`);
export default function TokenDesk({
  coin,
  initialWindow = "24h",
}: {
  coin: string;
  initialWindow?: string;
}) {
  const [window, setWindow] = useState(initialWindow),
    [cohort, setCohort] = useState("all"),
    [mode, setMode] = useState("positions"),
    [tab, setTab] = useState("leaders"),
    [qualified, setQualified] = useState(false),
    [search, setSearch] = useState("");
  const [collecting, setCollecting] = useState(false),
    [collectionMessage, setCollectionMessage] = useState(""),
    [sort, setSort] = useState("score");
  const r = useData(
      `token-desk?coin=${encodeURIComponent(coin)}&window=${window}&cohort=${cohort}`,
      30000,
    ),
    d =
      r.data?.coin === coin &&
      r.data?.window === window &&
      r.data?.cohort === cohort
        ? r.data
        : null;
  async function collect() {
    setCollecting(true);
    try {
      const response = await fetch("/api/engine/token-desk/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Refresh unavailable");
      setCollectionMessage(
        `Refreshing ${result.positionTarget} wallet snapshots and ${result.addresses.length} execution histories. Panels update as results arrive.`,
      );
      void r.reload();
    } catch (e: any) {
      setCollectionMessage(e.message);
    } finally {
      setCollecting(false);
    }
  }
  useEffect(() => {
    void collect();
  }, [coin]);
  const gross = (d?.positioning.long || 0) + (d?.positioning.short || 0),
    p = d?.positioning,
    t = d?.technical;
  const rows = (d?.rows || [])
    .filter(
      (w: any) =>
        (!qualified || w.qualified) &&
        `${w.name || ""} ${w.address}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (tab !== "positions" || w.position),
    )
    .sort((a: any, b: any) =>
      sort === "pnl"
        ? (b.token?.netPnl ?? -Infinity) - (a.token?.netPnl ?? -Infinity)
        : sort === "position"
          ? (b.position?.value || 0) - (a.position?.value || 0)
          : sort === "activity"
            ? (b.activity?.notional || 0) - (a.activity?.notional || 0)
            : Number(b.qualified) - Number(a.qualified) ||
              (b.token?.score ?? -1) - (a.token?.score ?? -1),
    );
  const totals = (d?.series || []).reduce(
    (s: any, b: any) => ({
      in: s.in + (b.inflow || 0),
      out: s.out - (b.outflow || 0),
      buy: s.buy + (b.netBuy || 0),
    }),
    { in: 0, out: 0, buy: 0 },
  );
  return (
    <div className="token-desk">
      <div className="desk-title">
        <div>
          <span className="eyebrow">TOKEN LENS / SMART-MONEY INTELLIGENCE</span>
          <h2>
            {coin} <span className="badge">{d?.assetClass || "Token"}</span>
          </h2>
          <p>Who trades it well. What they hold. How their flows meet price.</p>
        </div>
        <div className="brief-filters">
          <button
            className="button"
            onClick={() => void collect()}
            disabled={collecting}
          >
            {collecting ? "Requesting…" : "Refresh wallet cohort"}
          </button>
          <select
            aria-label="Token Lens cohort"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
          >
            <option value="all">All indexed wallets</option>
            <option value="pilot">V2 pilot</option>
          </select>
          <button
            className="button"
            disabled={!d || r.loading || !!r.error}
            onClick={() =>
              download(
                `davira-${coin.replace(":", "-")}-lens.json`,
                JSON.stringify(d, null, 2),
                "application/json",
              )
            }
          >
            Export evidence
          </button>
        </div>
      </div>
      <DataState resource={r} />
      {collectionMessage && (
        <p className="brief-caption" role="status">
          {collectionMessage}
        </p>
      )}
      {d && (
        <>
          <div className="desk-coverage-strip panel">
            <div>
              <b>{d.rows.length}</b>
              <span>{coin} wallet records</span>
            </div>
            <div>
              <b>{d.coverage.fills.toLocaleString()}</b>
              <span>Retained {coin} fills · 30d</span>
            </div>
            <div>
              <b>{d.coverage.freshTokenAnalyses}</b>
              <span>Fresh token analyses · under 1h</span>
            </div>
            <div>
              <b>{p.longWallets + p.shortWallets}</b>
              <span>Fresh open {coin} positions</span>
            </div>
          </div>
          {d.collection && (
            <p className="brief-caption" role="status">
              Cohort refresh: {d.collection.positionChecked}/
              {d.collection.positionTarget} snapshots checked ·{" "}
              {d.collection.refreshed}/{d.collection.addresses.length} analyses
              refreshed · {d.collection.historyAdded.toLocaleString()} older
              fills added · {d.collection.historyPending} histories pending
              {d.collection.errors
                ? ` · ${d.collection.errors} source errors`
                : ""}
              {d.collection.paused ? " · Collection is paused in settings" : ""}
              .
            </p>
          )}
          <DecisionPanel data={d.decision} sourceAt={d.updatedAt} />
          <div className="desk-top">
            <section className="panel research-card">
              <div className="panel-head desk-panel-head">
                <h3>Current positioning</h3>
                <span>{p.longWallets + p.shortWallets} fresh open wallets</span>
              </div>
              <strong
                className={`desk-number ${p.long - p.short >= 0 ? "positive" : "negative"}`}
              >
                {money(p.long - p.short)}
              </strong>
              <p>Net long exposure · long minus short notional</p>
              <div
                className="desk-position-bar"
                style={!gross ? { background: "var(--line)" } : undefined}
                aria-label={`${fmt(gross ? (p.long / gross) * 100 : null)} long exposure`}
              >
                <i
                  style={{ width: `${gross ? (p.long / gross) * 100 : 0}%` }}
                />
              </div>
              <div className="desk-sides">
                <span className="positive">
                  {money(p.long)} long · {p.longWallets}
                </span>
                <span className="negative">
                  {money(p.short)} short · {p.shortWallets}
                </span>
              </div>
              <h4>Largest current positions</h4>
              {p.top.map((w: any) => (
                <div className="desk-contributor" key={w.address}>
                  <Link href={`/wallet/${w.address}`}>
                    {w.name || short(w.address)}
                  </Link>
                  <span>
                    {w.position.size > 0 ? "Long" : "Short"} ·{" "}
                    {gross ? fmt((w.position.value / gross) * 100) : "—"}
                  </span>
                </div>
              ))}
              {!p.top.length && (
                <p>
                  No fresh covered positions. This does not establish market
                  neutrality.
                </p>
              )}
              <small className="muted">
                {p.unavailable} wallet snapshots unavailable or older than 1h.
                Snapshots are asynchronous; this is a sampled book, not
                exchange-wide exposure.
              </small>
            </section>
            <section className="panel research-card">
              <div className="desk-chart-head">
                <div>
                  <h3>Flows × market price</h3>
                  <p>
                    {money(totals.in)} opened · {money(totals.out)} closed
                  </p>
                </div>
                <div className="tabs">
                  {["6h", "24h", "7d", "30d"].map((w) => (
                    <button
                      key={w}
                      className={window === w ? "selected" : ""}
                      onClick={() => setWindow(w)}
                    >
                      {w.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tabs">
                <button
                  className={mode === "positions" ? "selected" : ""}
                  onClick={() => setMode("positions")}
                >
                  Position inflow / outflow
                </button>
                <button
                  className={mode === "direction" ? "selected" : ""}
                  onClick={() => setMode("direction")}
                >
                  Net buy / sell
                </button>
              </div>
              <div
                className="desk-chart"
                role="img"
                aria-label={`${coin} ${window} wallet flows with hourly market candle closes`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={d.series}
                    margin={{ top: 18, right: 10, left: 0, bottom: 6 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--line)"
                      strokeDasharray="3 4"
                    />
                    <XAxis
                      dataKey="t"
                      minTickGap={35}
                      tick={{ fontSize: 10, fill: "var(--muted)" }}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleString(
                          "en",
                          window === "24h"
                            ? { hour: "2-digit", hour12: false }
                            : { month: "short", day: "numeric" },
                        )
                      }
                    />
                    <YAxis
                      yAxisId="flow"
                      width={66}
                      tick={{ fontSize: 10, fill: "var(--muted)" }}
                      tickFormatter={(v) => money(v)}
                    />
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      domain={["auto", "auto"]}
                      width={68}
                      tick={{ fontSize: 10, fill: "var(--muted)" }}
                      tickFormatter={(v) => price(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        color: "var(--text)",
                      }}
                      labelFormatter={(v) =>
                        `${new Date(v).toLocaleString()} · bucket start`
                      }
                      formatter={(value: any, name: any) => [
                        name === "Market close"
                          ? price(Number(value))
                          : money(Number(value)),
                        name,
                      ]}
                    />
                    <ReferenceLine
                      yAxisId="flow"
                      y={0}
                      stroke="var(--line-strong)"
                    />
                    {mode === "positions" && (
                      <Bar
                        yAxisId="flow"
                        dataKey="inflow"
                        name="Opened notional"
                        fill="var(--positive)"
                        isAnimationActive={false}
                      />
                    )}
                    {mode === "positions" && (
                      <Bar
                        yAxisId="flow"
                        dataKey="outflow"
                        name="Closed notional (negative axis)"
                        fill="var(--negative)"
                        isAnimationActive={false}
                      />
                    )}
                    {mode === "direction" && (
                      <Bar
                        yAxisId="flow"
                        dataKey="netBuy"
                        name="Net buy / sell"
                        isAnimationActive={false}
                      >
                        {d.series.map((b: any) => (
                          <Cell
                            key={b.t}
                            fill={
                              b.netBuy >= 0
                                ? "var(--positive)"
                                : "var(--negative)"
                            }
                          />
                        ))}
                      </Bar>
                    )}
                    <Line
                      yAxisId="price"
                      type="linear"
                      dataKey="price"
                      name="Market close"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="desk-legend">
                <span>
                  <i style={{ background: "var(--positive)" }} />{" "}
                  {mode === "positions" ? "Opened exposure" : "Net buying"}
                </span>
                <span>
                  <i style={{ background: "var(--negative)" }} />{" "}
                  {mode === "positions" ? "Closed exposure" : "Net selling"}
                </span>
                <span>
                  <i style={{ background: "var(--accent)" }} /> Market close ·
                  right axis
                </span>
              </div>
              <p className="brief-caption">
                {window === "24h" ? "Hourly" : "Daily UTC"} buckets · both short
                and long openings count as inflow. Net buying = new longs +
                short exits − new shorts − long exits. Position flows are not
                deposits. Empty bars mean no indexed executions; missing price
                candles stay blank. Edge buckets may be partial.
              </p>
              {(d.priceError || d.priceStale) && (
                <p className="notice">
                  Market history {d.priceError || "is cached; refresh pending"}.
                </p>
              )}
              <small className="muted">
                Candle source retrieved {time(d.priceAt)} ·{" "}
                {d.coverage.contributors} contributing wallets in retained
                history
              </small>
            </section>
          </div>
          <section className="panel research-card">
            <div className="desk-chart-head">
              <div>
                <span className="eyebrow">ACTIVITY ACROSS TIME</span>
                <h3>Is the positioning building or unwinding?</h3>
              </div>
              <small className="muted">
                Current indexed cohort · retained executions
              </small>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Window</th>
                    <th>New longs</th>
                    <th>Long exits</th>
                    <th>New shorts</th>
                    <th>Short covers</th>
                    <th>Net buying</th>
                    <th>Wallets / fills</th>
                    <th>Largest wallet share</th>
                    <th>Price change*</th>
                  </tr>
                </thead>
                <tbody>
                  {d.windows.map((w: any) => (
                    <tr key={w.label}>
                      <td>
                        <b>{w.label.toUpperCase()}</b>
                      </td>
                      <td className="positive">
                        {w.fills ? money(w.longIn) : "—"}
                      </td>
                      <td>{w.fills ? money(w.longOut) : "—"}</td>
                      <td className="negative">
                        {w.fills ? money(w.shortIn) : "—"}
                      </td>
                      <td>{w.fills ? money(w.shortOut) : "—"}</td>
                      <td className={w.netBuy >= 0 ? "positive" : "negative"}>
                        {w.fills ? money(w.netBuy) : "—"}
                      </td>
                      <td>
                        {w.wallets} / {w.fills.toLocaleString()}
                      </td>
                      <td>
                        {w.topShare == null ? "—" : fmt(w.topShare * 100)}
                      </td>
                      <td>
                        {w.priceChange == null ? "—" : pct(w.priceChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="brief-caption">
              *Price change uses the opening of the first intersecting hourly
              candle to the latest completed close. Flows use the exact rolling
              window. Short covering and long exits are shown separately so you
              can distinguish entries from exits.
            </p>
          </section>
          <ProbabilityPanel data={d.probability} />
          <div className="desk-research-grid desk-price-context">
            <section className="panel research-card">
              <span className="eyebrow">
                PRICE STRUCTURE / COMPLETED 1H CANDLES
              </span>
              <h3>{t?.trend || "Waiting for continuous candle history"}</h3>
              {t ? (
                <>
                  <dl className="facts">
                    <div>
                      <dt>20-hour average</dt>
                      <dd>{price(t.sma20)}</dd>
                    </div>
                    <div>
                      <dt>14-hour average true range</dt>
                      <dd>{price(t.atr14)}</dd>
                    </div>
                    <div>
                      <dt>14-period RSI · simple averages</dt>
                      <dd>{t.rsi14.toFixed(1)} / 100</dd>
                    </div>
                    <div>
                      <dt>20-hour low / high</dt>
                      <dd>
                        {price(t.support)} / {price(t.resistance)}
                      </dd>
                    </div>
                    <div>
                      <dt>Latest completed candle</dt>
                      <dd>{time(t.at)}</dd>
                    </div>
                  </dl>
                  <p>
                    {totals.buy > 0 && t.price < t.sma20
                      ? "Wallet executions show net buying while price remains below its average. Investigate whether this is short covering or new long exposure."
                      : totals.buy < 0 && t.price > t.sma20
                        ? "Wallet executions show net selling while price remains above its average. Inspect exits and concentration before interpreting a reversal."
                        : "Check whether new-position flows and price structure agree; aggregate net buying alone does not establish bullish conviction."}
                  </p>
                  <small className="muted">
                    ATR uses simple mean true range; RSI uses simple gain/loss
                    averages, not Wilder smoothing. Local highs/lows are
                    context, not validated support or resistance.
                  </small>
                </>
              ) : (
                <p>
                  Requires 21 consecutive completed hourly candles ending at the
                  latest hour. Missing candles are not filled with invented
                  prices.
                </p>
              )}
              <hr />
              <h4>Pre-move wallet research</h4>
              <p>
                Reserved for your methodology. No wallet is labeled as
                front-running from these observations alone.
              </p>
            </section>
          </div>
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">THE WALLETS BEHIND {coin}</span>
                <h3>Collective intelligence feed</h3>
              </div>
              <div className="tabs">
                {[
                  ["leaders", "Token track records"],
                  ["positions", "Current positions"],
                  ["feed", "Recent executions"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={tab === id ? "selected" : ""}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel-foot brief-filters">
              <input
                aria-label="Search token wallets"
                placeholder="Wallet name or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {tab !== "feed" && (
                <label>
                  <input
                    type="checkbox"
                    checked={qualified}
                    onChange={(e) => setQualified(e.target.checked)}
                  />{" "}
                  Qualified token records only
                </label>
              )}
              <span className="muted">
                {tab === "feed"
                  ? "Latest 100 observed executions"
                  : "Token-specific record, not whole-wallet PnL"}
              </span>
              {tab !== "feed" && (
                <select
                  aria-label="Sort token wallets"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="score">Token quality</option>
                  <option value="pnl">Token PnL</option>
                  <option value="position">Current position size</option>
                  <option value="activity">Selected-window turnover</option>
                </select>
              )}
            </div>
            <div
              className="table-scroll"
              style={{ maxHeight: 520, overflow: "auto" }}
            >
              {tab === "feed" ? (
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Wallet</th>
                      <th>Action</th>
                      <th>Execution price</th>
                      <th>Notional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.feed
                      .filter((f: any) =>
                        `${d.rows.find((w: any) => w.address === f.address)?.name || ""} ${f.address}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((f: any, j: number) => (
                        <tr key={`${f.address}:${f.time}:${j}`}>
                          <td>{time(f.time)}</td>
                          <td>
                            <Link href={`/wallet/${f.address}`}>
                              {d.rows.find((w: any) => w.address === f.address)
                                ?.name || short(f.address)}
                            </Link>
                          </td>
                          <td>{f.action}</td>
                          <td>{price(f.price)}</td>
                          <td>{money(f.notional)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Wallet</th>
                      <th>{coin} episode PnL</th>
                      <th>Quality / trades</th>
                      <th>Win rate / closing days</th>
                      <th>Current {coin} position</th>
                      <th>Entry / unrealized PnL</th>
                      <th>Leverage</th>
                      <th>Snapshot</th>
                      <th>{window.toUpperCase()} net buying / fills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((w: any) => (
                      <tr key={w.address}>
                        <td>
                          <Link
                            className="text-link"
                            href={`/wallet/${w.address}`}
                          >
                            {w.name || short(w.address)}
                          </Link>
                          <small className="brief-sub">
                            {w.qualified
                              ? "Qualified token record"
                              : "Limited / unqualified evidence"}
                          </small>
                          {!w.qualified &&
                            w.qualificationReasons?.length > 0 && (
                              <details className="desk-record-reasons">
                                <summary>Why this record is limited</summary>
                                <ul>
                                  {w.qualificationReasons.map(
                                    (reason: string) => (
                                      <li key={reason}>{reason}</li>
                                    ),
                                  )}
                                </ul>
                              </details>
                            )}
                        </td>
                        <td
                          className={
                            (w.token?.netPnl || 0) >= 0
                              ? "positive"
                              : "negative"
                          }
                        >
                          {w.token?.completeTrades
                            ? money(w.token.netPnl, 2)
                            : "—"}
                          <small className="brief-sub">
                            {w.token
                              ? `Observed fills: ${money(w.token.samplePnl, 2)}`
                              : "No token history"}
                          </small>
                        </td>
                        <td>
                          {w.token?.score ?? "—"} /{" "}
                          {w.token?.completeTrades ?? 0}
                          <small className="brief-sub">
                            Record {time(w.analysisAt)}
                          </small>
                        </td>
                        <td>
                          {fmt(w.token?.winRate)} / {w.token?.activeDays ?? 0}
                        </td>
                        <td>
                          {w.position
                            ? `${w.position.size > 0 ? "Long" : "Short"} ${money(w.position.value)}`
                            : w.positionState}
                        </td>
                        <td>
                          {w.position
                            ? `${price(w.position.entry)} / ${money(w.position.unrealized, 2)}`
                            : "—"}
                        </td>
                        <td>{w.position ? `${w.position.leverage}×` : "—"}</td>
                        <td>{time(w.positionAt)}</td>
                        <td>
                          {w.activity
                            ? `${money(w.activity.netBuy)} / ${w.activity.fills.toLocaleString()}`
                            : "—"}
                          {w.activity && (
                            <small className="brief-sub">
                              Last execution {time(w.activity.last)}
                            </small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {tab !== "feed" && !rows.length && (
              <Empty title="No wallets match this view">
                Clear the qualification filter or allow more history to collect.
              </Empty>
            )}
            <div className="panel-foot">
              Observed token record within the analysis archive, typically up to
              30 days; fees included, funding excluded. Qualified = ≥10 complete
              episodes, ≥3 closing days, positive token PnL, score ≥60, fresh
              fill analysis, uncapped response and no detected discontinuities.
              A stale position is unavailable, never assumed flat.
            </div>
          </section>
          <p className="brief-caption">
            Coverage: {d.coverage.fills.toLocaleString()} retained fills across{" "}
            {d.coverage.contributors} wallets · {time(d.coverage.first)} to{" "}
            {time(d.coverage.last)}. Current cohort membership is applied to
            historical flows. Counts and dollars represent observed wallet
            activity; counterparties may both be in the sample.
          </p>
        </>
      )}
    </div>
  );
}
