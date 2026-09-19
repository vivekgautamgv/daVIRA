"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Activity,
} from "lucide-react";
import Terminal, {
  useData,
  Heading,
  Stat,
  Empty,
  money,
  short,
  pct,
  price,
} from "./terminal";
import { DataState, time } from "./ui";
export default function Intelligence() {
  const r = useData("intelligence", 30000),
    [coin, setCoin] = useState(""),
    [q, setQ] = useState(""),
    [minimum, setMinimum] = useState("0"),
    [allMarkets, setAllMarkets] = useState(false),
    [pool, setPool] = useState("all");
  const d = r.data,
    wallets = d?.wallets || [],
    exposures = d?.exposures || [],
    selected = exposures.find((c: any) => c.coin === coin) || exposures[0],
    gross = exposures.reduce((n: number, c: any) => n + c.gross, 0);
  const movements = (d?.movements || []).filter(
    (x: any) =>
      (!q ||
        `${x.coin} ${x.address}`.toLowerCase().includes(q.toLowerCase())) &&
      Math.abs(x.notional_delta) >= Number(minimum) &&
      (pool === "all" ||
        wallets.some(
          (w: any) => w.address === x.address && w.source === "Your watchlist",
        )),
  );
  return (
    <Terminal view="overview">
      <Heading
        eyebrow="SMART MONEY / LIVE RESEARCH"
        title="Follow the position"
        text="Where profitable wallets are exposed—and what they change next."
      >
        <Link className="button primary" href="/discover">
          Build your cohort <ArrowUpRight size={16} />
        </Link>
      </Heading>
      <DataState resource={r} />
      <div className="desk-summary">
        <span className="desk-indicator" />
        <b>Research desk</b>
        <span>{d?.freshWallets ?? "—"} fresh wallet snapshots</span>
        <span className="desk-divider" />
        <span>Main Hyperliquid DEX</span>
        <span className="desk-updated">Snapshot {time(d?.cohortAt)}</span>
      </div>
      <div className="stats">
        <Stat
          label="Wallets in the cohort"
          value={d ? String(wallets.length) : "—"}
          detail="Research sample + your watchlist"
        />
        <Stat
          label="Observed gross exposure"
          value={d ? money(gross) : "—"}
          detail="Long and short notional combined"
        />
        <Stat
          label="Markets with positions"
          value={d ? String(exposures.length) : "—"}
          detail="From fresh account snapshots"
        />
        <Stat
          label="Recent position changes"
          value={d ? String(d.movements.length) : "—"}
          detail="Latest 150 retained observations"
        />
      </div>
      <div className="intelligence-layout">
        <section className="panel exposure-panel">
          <div className="panel-head">
            <div>
              <h2>Positioning across the cohort</h2>
              <p>Select a market to inspect the wallets behind it</p>
            </div>
            <span className="pill">GROSS NOTIONAL</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Long / short exposure</th>
                  <th>Net exposure</th>
                  <th>Wallets</th>
                  <th>24h price</th>
                </tr>
              </thead>
              <tbody>
                {exposures
                  .slice(0, allMarkets ? exposures.length : 14)
                  .map((c: any) => (
                    <tr
                      key={c.coin}
                      className={`selectable-row ${selected?.coin === c.coin ? "selected-row" : ""}`}
                    >
                      <td>
                        <button
                          className="asset-pick"
                          onClick={() => setCoin(c.coin)}
                          aria-pressed={selected?.coin === c.coin}
                        >
                          <span className="coin-icon">{c.coin[0]}</span>
                          <b>{c.coin}</b>
                        </button>
                      </td>
                      <td>
                        <div className="exposure-label">
                          <span>{money(c.long)}</span>
                          <span>{money(c.short)}</span>
                        </div>
                        <div className="exposure-bar">
                          <i
                            style={{ width: `${(c.long / c.gross) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className={c.net >= 0 ? "positive" : "negative"}>
                        {c.net > 0 ? "+" : ""}
                        {money(c.net)}
                      </td>
                      <td>
                        <span className="positive">{c.longWallets} L</span>
                        <span className="muted"> / </span>
                        <span className="negative">{c.shortWallets} S</span>
                      </td>
                      <td className={c.change >= 0 ? "positive" : "negative"}>
                        {pct(c.change)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!exposures.length && (
              <Empty
                title={
                  r.loading
                    ? "Loading the research cohort"
                    : "Establishing the first observations"
                }
              >
                The collector selects qualifying public leaderboard wallets and
                reads their current positions. Your own watchlist is included
                automatically.
              </Empty>
            )}
          </div>
          <div className="panel-foot">
            <span>
              <i className="legend-dot long" /> Long{" "}
              <i className="legend-dot short" /> Short
            </span>
            <span>
              Exposure totals are a selected sample, not market-wide flows.
            </span>
            {exposures.length > 14 && (
              <button
                className="text-link"
                onClick={() => setAllMarkets(!allMarkets)}
              >
                {allMarkets ? "Show top 14" : `Show all ${exposures.length}`}
              </button>
            )}
          </div>
        </section>
        <aside className="panel conviction-panel">
          <div className="panel-head">
            <h2>Read the evidence</h2>
            <Activity size={17} />
          </div>
          {selected ? (
            <>
              <div className="selected-market">
                <span className="eyebrow">
                  {selected.coin} / COHORT POSITIONING
                </span>
                <strong>{money(selected.gross)}</strong>
                <span>observed gross exposure</span>
              </div>
              <div className="evidence-block">
                <span className="evidence-index">01</span>
                <div>
                  <h3>
                    {selected.net >= 0 ? "Long" : "Short"} exposure dominates
                  </h3>
                  <p>
                    {(
                      (Math.max(selected.long, selected.short) /
                        selected.gross) *
                      100
                    ).toFixed(2)}
                    % of this sample’s notional is on the{" "}
                    {selected.net >= 0 ? "long" : "short"} side. Compare the
                    number of wallets with the size of their positions.
                  </p>
                </div>
              </div>
              <div className="evidence-block">
                <span className="evidence-index">02</span>
                <div>
                  <h3>
                    {selected.largestShare >= 50
                      ? "Concentrated in one wallet"
                      : "Distributed across wallets"}
                  </h3>
                  <p>
                    The largest position accounts for{" "}
                    {selected.largestShare.toFixed(1)}% of sampled{" "}
                    {selected.coin} exposure. Shared direction does not
                    establish independent conviction.
                  </p>
                </div>
              </div>
              <div className="evidence-block">
                <span className="evidence-index">03</span>
                <div>
                  <h3>Watch the next size change</h3>
                  <p>
                    Fresh additions strengthen observed positioning; reductions
                    may weaken it. The current snapshot alone says nothing about
                    the next price move.
                  </p>
                </div>
              </div>
              <Link
                className="text-link evidence-link"
                href={`/reports?coin=${selected.coin}`}
              >
                Inspect market context <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <Empty title="Evidence appears with the first cohort" />
          )}
        </aside>
      </div>
      {selected && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Behind the position{" "}
                <span className="muted">/ {selected.coin}</span>
              </h2>
              <p>
                Open the profile before treating a large position as a useful
                signal
              </p>
            </div>
            <Link className="text-link" href={`/coins?coin=${selected.coin}`}>
              {selected.coin} market <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Direction</th>
                  <th>Position notional</th>
                  <th>Notional / equity</th>
                  <th>Unrealized PnL</th>
                  <th>Snapshot</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...selected.positions]
                  .sort((a: any, b: any) => b.value - a.value)
                  .map((w: any) => (
                    <tr key={w.address}>
                      <td>
                        <Link
                          className="asset-cell"
                          href={`/wallet/${w.address}`}
                        >
                          <span className="wallet-ident">
                            {(w.name || "W")[0]}
                          </span>
                          <div>
                            <b>{w.name || short(w.address)}</b>
                            <small>{w.source}</small>
                          </div>
                        </Link>
                      </td>
                      <td className={w.size > 0 ? "positive" : "negative"}>
                        {w.size > 0 ? "Long" : "Short"}
                      </td>
                      <td>{money(w.value)}</td>
                      <td>
                        {w.equity > 0
                          ? `${(w.value / w.equity).toFixed(2)}×`
                          : "—"}
                      </td>
                      <td
                        className={w.unrealized >= 0 ? "positive" : "negative"}
                      >
                        {money(w.unrealized)}
                      </td>
                      <td>{time(w.updatedAt)}</td>
                      <td>
                        <Link
                          className="icon-button"
                          href={`/wallet/${w.address}`}
                          aria-label={`Inspect ${short(w.address)}`}
                        >
                          <ArrowUpRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Movement ledger</h2>
            <p>New, added, reduced, closed and reversed positions</p>
          </div>
          <Link className="text-link" href="/radar">
            Set an alert <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="toolbar compact">
          <label className="search">
            <Search size={16} />
            <input
              placeholder="Filter asset or wallet"
              aria-label="Filter movements"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label>
            Cohort
            <select value={pool} onChange={(e) => setPool(e.target.value)}>
              <option value="all">All observed wallets</option>
              <option value="watchlist">My watchlist</option>
            </select>
          </label>
          <label>
            Minimum change
            <select
              value={minimum}
              onChange={(e) => setMinimum(e.target.value)}
            >
              <option value="0">Any size</option>
              <option value="10000">$10,000</option>
              <option value="100000">$100,000</option>
              <option value="1000000">$1,000,000</option>
            </select>
          </label>
        </div>
        {movements.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Observed</th>
                  <th>Wallet</th>
                  <th>Market</th>
                  <th>Action</th>
                  <th>New direction</th>
                  <th>Signed exposure change</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 30).map((x: any) => (
                  <tr key={x.id}>
                    <td>{time(x.time)}</td>
                    <td>
                      <Link href={`/wallet/${x.address}`}>
                        {wallets.find((w: any) => w.address === x.address)
                          ?.name || short(x.address)}
                      </Link>
                    </td>
                    <td>{x.coin}</td>
                    <td>
                      <span className={`movement-tag ${x.kind}`}>{x.kind}</span>
                    </td>
                    <td>
                      {x.new_size === 0
                        ? "Flat"
                        : x.new_size > 0
                          ? "Long"
                          : "Short"}
                    </td>
                    <td
                      className={
                        x.notional_delta >= 0 ? "positive" : "negative"
                      }
                    >
                      {money(x.notional_delta)}
                    </td>
                    <td>
                      <Link href={`/wallet/${x.address}`} className="text-link">
                        Inspect <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Waiting for a position change">
            First snapshots establish a baseline. Keep the collector running;
            changes to the research sample are checked every five minutes, and
            your watchlist about every minute.
          </Empty>
        )}
        <div className="panel-foot">
          Signed exposure change = change in position quantity × observed mark
          price. It is not a deposit, withdrawal or executed trade.
        </div>
      </section>
      <details className="methodology">
        <summary>Selection criteria & coverage</summary>
        <p>
          {d?.coverage ||
            "The research cohort is being selected from the public leaderboard."}
        </p>
        <p>
          Leaderboard snapshot: {time(d?.leaderboardAt)}. “Smart money” is a
          research category, not a verified label. A profitable account may be
          hedged elsewhere. This app cannot establish who controls the market.
        </p>
      </details>
    </Terminal>
  );
}
