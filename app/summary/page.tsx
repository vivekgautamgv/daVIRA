"use client";
import { useState } from "react";
import Link from "next/link";
import Terminal, { useData, money, Empty } from "../terminal";
import { DataState, time } from "../ui";
import CoinBrief from "../coin-brief";
const percent = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(1)}%`;
const behaviors = [
  "Long building",
  "Short building",
  "Long unwinding",
  "Short covering",
];

export default function Summary() {
  const [window, setWindow] = useState("24h"),
    [coin, setCoin] = useState(""),
    [query, setQuery] = useState(""),
    [cohort, setCohort] = useState("all"),
    [filter, setFilter] = useState("All activity");
  const r = useData(`flows?window=${window}&cohort=${cohort}`, 30000);
  const rows = r.data?.data || [],
    selected = rows.find((c: any) => c.coin === coin) || rows[0];
  const active = rows.filter((c: any) => c.brief?.recent);
  const count = (label: string) =>
    active.filter((c: any) => c.brief?.behavior === label).length;
  const ready = rows.filter((c: any) =>
    ["Long bias", "Short bias"].includes(c.marketRead?.action),
  ).length;
  const coverage = r.data?.coverage;
  const blockers: Record<string, number> = {};
  for (const c of rows)
    for (const reason of c.marketRead?.reasons || [])
      blockers[reason] = (blockers[reason] || 0) + 1;
  const filtered = rows.filter(
    (c: any) =>
      c.coin.toLowerCase().includes(query.trim().toLowerCase()) &&
      (filter === "All activity" ||
        (filter === "Disagreement"
          ? c.brief?.disagreement
          : filter === "Setup eligible"
            ? ["Long bias", "Short bias"].includes(c.marketRead?.action)
            : c.brief?.behavior === filter)),
  );
  const i = selected?.insight,
    b = selected?.brief,
    context = selected?.context,
    read = selected?.marketRead;
  const directionLabel = (v: number) =>
    v > 0 ? "net buying" : v < 0 ? "net selling" : "balanced";
  return (
    <Terminal view="summary">
      <div className="screener-heading">
        <div>
          <span className="eyebrow">MARKET BRIEF / POSITIONING COMPASS v2</span>
          <h1>Read the positioning behind the move.</h1>
          <p>
            Separate fresh exposure, exits and wallet disagreement. Then assess
            whether a setup has enough evidence.
          </p>
        </div>
        <div className="tabs">
          <select
            aria-label="Intelligence brief coin"
            value={selected?.coin || ""}
            onChange={(e) => setCoin(e.target.value)}
            disabled={!rows.length}
          >
            {!rows.length && <option value="">Collecting coins…</option>}
            {rows.map((c: any) => (
              <option key={c.coin} value={c.coin}>
                {c.coin}
              </option>
            ))}
          </select>
          {["6h", "24h"].map((w) => (
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
      <DataState resource={r} />
      <div className="stats brief-stats">
        {behaviors.map((label) => (
          <button
            className={`panel research-card brief-stat ${filter === label ? "active" : ""}`}
            key={label}
            onClick={() => setFilter(filter === label ? "All activity" : label)}
          >
            <span>{label}</span>
            <strong>
              {count(label)} <small>coins</small>
            </strong>
            <span>
              {label === "Long building"
                ? "Fresh long exposure"
                : label === "Short building"
                  ? "Fresh short exposure"
                  : label === "Long unwinding"
                    ? "Existing longs closing"
                    : "Existing shorts closing"}
            </span>
          </button>
        ))}
      </div>
      <div className="brief-strip">
        <span>
          <strong>{active.length}</strong> coins with an execution in the last
          2h
        </span>
        <span>
          <strong>{ready}</strong> directional setups pass the gates
        </span>
        <span>
          Indexed sample · {coverage?.wallets ?? "—"} wallets · refreshed{" "}
          {time(r.data?.updatedAt)}
        </span>
      </div>
      <p className="notice">
        A falling price can coexist with wallet buying or short covering. These
        are observations, not forecasts. Position inflow/outflow measures
        opened/closed notional, not deposits or withdrawals. Missing evidence
        blocks trade setups, but does not erase observed activity.
      </p>
      {selected && (
        <section id="coin-brief">
          <CoinBrief coin={selected.coin} window={window} cohort={cohort} />
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">01 / OBSERVE</span>
            <h2>Coin intelligence board</h2>
          </div>
          <span>
            {filtered.length} of {rows.length} instruments
          </span>
        </div>
        <div className="panel-foot brief-filters">
          <select
            aria-label="Summary wallet cohort"
            value={cohort}
            onChange={(e) => setCohort(e.target.value)}
          >
            <option value="all">All indexed wallets</option>
            <option value="pilot">V2 pilot wallets</option>
            <option value="watchlist">My watchlist</option>
          </select>
          <input
            aria-label="Search summary coins"
            placeholder="Find BTC, ETH, xyz:TSLA…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filter observed behavior"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "All activity",
              ...behaviors,
              "Two-way positioning",
              "Disagreement",
              "Setup eligible",
            ].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div
          className="table-scroll"
          style={{ maxHeight: 520, overflow: "auto" }}
        >
          <table>
            <thead>
              <tr>
                <th>Coin / last execution</th>
                <th>Observed behavior</th>
                <th>Buy pressure /100</th>
                <th>Wallet breadth ↑ / ↓</th>
                <th>Position inflow / outflow</th>
                <th>Setup readiness</th>
                <th>Fresh specialists / wallets</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => (
                <tr
                  key={c.coin}
                  className={selected?.coin === c.coin ? "selected-row" : ""}
                >
                  <td>
                    <button
                      className="text-link"
                      onClick={() => {
                        setCoin(c.coin);
                        document.getElementById("coin-brief")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      {c.coin}
                    </button>
                    <small className="brief-sub">
                      {time(c.marketRead?.latest)}
                      {!c.brief?.recent && " · older activity"}
                    </small>
                  </td>
                  <td>
                    {c.brief?.behavior}
                    <small className="brief-sub">{c.brief?.exposure}</small>
                    {c.brief?.disagreement && (
                      <small className="brief-flag">Disagreement</small>
                    )}
                  </td>
                  <td>
                    <strong>{c.brief?.pressure ?? "—"}</strong>
                    <small className="brief-sub">
                      {c.brief?.pressureLabel}
                    </small>
                  </td>
                  <td>
                    {c.insight?.bullishWallets} / {c.insight?.bearishWallets}
                    <small className="brief-sub">
                      By signed position change
                    </small>
                  </td>
                  <td>
                    {money(c.inflow)} / {money(c.outflow)}
                  </td>
                  <td>
                    {c.brief?.readiness}
                    <small className="brief-sub">
                      {c.marketRead?.reasons?.length
                        ? `${c.marketRead.reasons.length} unmet checks`
                        : `Evidence ${c.marketRead?.confidence}/100`}
                    </small>
                  </td>
                  <td>
                    {c.marketRead?.qualified} / {c.wallets}
                    <small className="brief-sub">
                      {c.marketRead?.fresh} fresh analyses
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title={
              rows.length
                ? "No instruments match this filter"
                : "Collecting execution evidence"
            }
          >
            {rows.length
              ? "Choose another behavior or clear the search."
              : "The collector needs indexed wallet history to build the brief."}
          </Empty>
        )}
      </section>
      {selected && b && (
        <section className="brief-detail">
          <div className="panel research-card">
            <span className="eyebrow">
              02 / EXPLAIN THE MOVE · {selected.coin}
            </span>
            <h2>
              {b.behavior} · {b.exposure.toLowerCase()}
            </h2>
            <p>
              {money(b.buy)} of buy executions versus {money(b.sell)} of sell
              executions in {window}. {i.bullishWallets} wallets increased
              signed exposure; {i.bearishWallets} decreased it.
            </p>
            <div className="brief-flow-grid">
              {[
                ["New longs", selected.longIn, "Buying to open"],
                ["New shorts", selected.shortIn, "Selling to open"],
                ["Long exits", selected.longOut, "Selling to close"],
                ["Short exits", selected.shortOut, "Buying to close"],
              ].map(([label, value, hint]: any) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{money(value)}</strong>
                  <small>{hint}</small>
                  <div className="brief-bar">
                    <span
                      style={{
                        width: `${Math.min(100, (100 * value) / Math.max(1, i.activity))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="brief-insights">
              <article>
                <h3>Does one wallet drive the story?</h3>
                <p>
                  Largest wallet: {percent(i.leaderShare)} of activity.
                  Excluding it: {money(Math.abs(i.excludingLeader))}{" "}
                  {directionLabel(i.excludingLeader)}.
                </p>
                <strong>
                  {b.disagreement ||
                    "No direction reversal from removing the largest wallet"}
                </strong>
                {i.leader && (
                  <Link
                    className="text-link brief-sub"
                    href={`/wallet/${i.leader}`}
                  >
                    Inspect largest contributor ↗
                  </Link>
                )}
              </article>
              <article>
                <h3>Is activity accelerating?</h3>
                <p>
                  {i.acceleration == null || read.fresh < read.count * 0.7
                    ? "Insufficient fresh analysis or baseline coverage for a comparison."
                    : `${i.acceleration.toFixed(2)}× activity in the latest ${i.halfWindowHours}h versus the preceding ${i.halfWindowHours}h, for wallets with a baseline.`}
                </p>
                <small>
                  {percent(i.baselineCoverage)} have retained history reaching
                  the window start. This does not prove uninterrupted
                  collection.
                </small>
              </article>
            </div>
            <p className="brief-caption">
              Buy pressure = buying notional ÷ all classified executions × 100.
              Short covering counts as buying; it is not new long conviction.
              Wallet breadth counts addresses, not independent owners.
            </p>
          </div>
          <div className="panel research-card">
            <span className="eyebrow">03 / MARKET CONTEXT</span>
            <h2>Price, leverage & positioning</h2>
            {context?.status !== "unavailable" && context?.price ? (
              <>
                <div className="brief-flow-grid">
                  <div>
                    <span>Mark price</span>
                    <strong>{money(context.price)}</strong>
                  </div>
                  <div>
                    <span>Open interest · USD</span>
                    <strong>{money(context.openInterest)}</strong>
                  </div>
                  <div>
                    <span>Current hourly funding</span>
                    <strong>
                      {context.funding == null
                        ? "—"
                        : `${(context.funding * 100).toFixed(4)}%`}
                    </strong>
                    <small>Positive: longs pay shorts</small>
                  </div>
                </div>
                {context.status === "ready" ? (
                  <>
                    <h3>{context.regime}</h3>
                    <p>
                      Price {percent(context.priceChange)} · OI in base units{" "}
                      {percent(context.oiChange)} ·{" "}
                      {context.elapsedHours.toFixed(1)}h observed interval.
                    </p>
                    <p>
                      {Math.abs(context.priceChange) >= 0.25 &&
                      b.pressure != null &&
                      ((context.priceChange < 0 && b.pressure >= 60) ||
                        (context.priceChange > 0 && b.pressure <= 40))
                        ? "Price and sampled execution pressure diverge. Investigate entry timing and other participants before treating this as a reversal."
                        : "Compare the venue-wide change with the wallet sample; they cover different participants."}
                    </p>
                  </>
                ) : (
                  <p className="notice">
                    {context.reason}. The {window} comparison appears after real
                    snapshots span that window.
                  </p>
                )}
                <small>
                  Quote {time(context.updatedAt)} · OI includes both sides of
                  every contract; expansion alone does not identify longs or
                  shorts.
                </small>
              </>
            ) : (
              <p>{context?.reason || "Market context unavailable"}</p>
            )}
          </div>
          <div className="panel research-card">
            <span className="eyebrow">04 / ASSESS A SETUP</span>
            <h2>{b.readiness}</h2>
            <p>{read.explanation}</p>
            <div className="brief-strip">
              <span>
                Direction score <strong>{read.score ?? "—"}/100</strong>
              </span>
              <span>
                Evidence <strong>{read.confidence}/100</strong>
              </span>
              <span>
                Historical record candidates{" "}
                <strong>{read.historicalQualified ?? 0}</strong> · fresh{" "}
                <strong>{read.qualified}</strong>
              </span>
            </div>
            <ul>
              {read.reasons.map((reason: string) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <div className="inline">
              <Link
                className="button primary"
                href={`/setups?coin=${encodeURIComponent(selected.coin)}`}
              >
                Review risk-based setup ↗
              </Link>
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
          </div>
        </section>
      )}
      <section className="panel research-card">
        <span className="eyebrow">
          COLLECTION HEALTH / WHY SETUPS MAY BE BLOCKED
        </span>
        <h2>Evidence you can audit</h2>
        <Link className="text-link" href="/coverage">
          Open the V2 coverage desk ↗
        </Link>
        <div className="brief-flow-grid">
          <div>
            <span>Indexed wallets</span>
            <strong>{coverage?.indexedWallets ?? "—"}</strong>
          </div>
          <div>
            <span>Fill analyses fresh within 1h</span>
            <strong>{coverage?.freshWallets ?? "—"}</strong>
          </div>
          <div>
            <span>Wallets with a candidate token record</span>
            <strong>{coverage?.historicalSpecialists ?? "—"}</strong>
          </div>
          <div>
            <span>Analyses queued</span>
            <strong>{coverage?.queue ?? "—"}</strong>
          </div>
        </div>
        <p>
          Large historical PnL alone does not establish token expertise. A
          wallet needs complete trading episodes across multiple days. Proven
          token records refresh ahead of broad discovery; followed wallets
          retain higher priority.
        </p>
        <div className="brief-blockers">
          {Object.entries(blockers)
            .sort((a, b) => b[1] - a[1])
            .map(([reason, n]) => (
              <div key={reason}>
                <span>{reason}</span>
                <strong>{n} coins</strong>
              </div>
            ))}
        </div>
      </section>
      <details className="panel research-card">
        <summary>Definitions, scoring and data limits</summary>
        <p>
          Observed behavior is the largest of four execution buckets when it
          accounts for at least 45% of activity; otherwise two-way positioning.
          Expanding or contracting exposure requires net opening or closing
          notional above 10% of total activity. Pressure describes executions
          and is not a return probability. Older activity is labeled; the top
          counters include only coins with an execution within two hours.
        </p>
        <p>
          Direction = 50 + 50 × (45% new long-minus-short opening balance + 35%
          quality-weighted specialist vote + 20% buy-minus-sell execution
          balance). Long bias ≥65; short bias ≤35. Gates: ≥5 wallets, ≥3
          specialists, largest share ≤60%, ≥70% fresh fill analyses, execution
          within 2h, ≥$10K opening notional and no material entry/specialist
          disagreement. Token specialists need score ≥60, positive token PnL,
          ≥10 complete episodes and ≥3 closing days, fill retrieval within one
          hour, no detected reconstruction gaps and an uncapped latest fill
          response. These same qualification checks apply in Token Lens.
          Evidence weights: breadth 35%, specialists 30%, concentration 20%,
          freshness 15%; not calibrated confidence.
        </p>
        <p>
          Open-interest history is sampled every five minutes on the main DEX
          and retained for three days. Comparisons use a baseline within ten
          minutes of the requested window and a quote within two minutes. OI
          change uses base units to remove price revaluation. A 1% OI or 0.25%
          price threshold labels the regime; these are descriptive heuristics.
          Gaps are not interpolated. No predictive edge or strategy
          profitability has been validated.
        </p>
      </details>
    </Terminal>
  );
}
