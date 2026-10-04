"use client";
import TokenDesk from "./token-desk";
import AssetPulse from "./asset-pulse";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import Terminal, {
  useData,
  Heading,
  Stat,
  Empty,
  Chart,
  MarketTable,
  money,
  price,
  pct,
  short,
} from "./terminal";
import { DataState, time } from "./ui";
export function Markets() {
  return (
    <Suspense fallback={<div className="loading-line">Loading markets…</div>}>
      <MarketContent />
    </Suspense>
  );
}
function MarketContent() {
  const params = useSearchParams(),
    selected = params.get("coin") || "BTC",
    [scope, setScope] = useState(selected?.includes(":") ? "global" : "main"),
    [q, setQ] = useState(""),
    [category, setCategory] = useState("All");
  useEffect(() => {
    if (selected) {
      setScope(selected.includes(":") ? "global" : "main");
      setCategory("All");
    }
  }, [selected]);
  const r = useData(scope === "global" ? "global-markets" : "markets", 60000),
    cross = useData(scope === "main" ? "cex" : null, 120000),
    tape = useData(
      selected ? `tape?coin=${encodeURIComponent(selected)}` : "tape",
      30000,
    ),
    chart = useData(
      selected && !selected.includes(":")
        ? `candles?coin=${encodeURIComponent(selected)}`
        : null,
      60000,
    );
  const markets =
      scope === "main" ? r.data?.data || [] : r.data?.data?.markets || [],
    current = markets.find((m: any) => m.coin === selected),
    bybit = cross.data?.data?.find((m: any) => m.coin === selected),
    rows = markets.filter(
      (m: any) =>
        m.coin.toLowerCase().includes(q.toLowerCase()) &&
        (category === "All" || category === m.category),
    );
  return (
    <Terminal view="coins">
      <Heading
        eyebrow="MARKET EXPLORER"
        title={current ? `${current.coin} / USD` : "Follow the market"}
        text={
          current
            ? "Price, positioning and observed trade activity in one view."
            : "Explore perpetual markets, RWA-related tokens and builder DEX instruments."
        }
      >
        {current && !current.dex && (
          <Link
            className="button primary"
            href={`/reports?coin=${current.coin}`}
          >
            Open research <ArrowUpRight size={16} />
          </Link>
        )}
      </Heading>
      <div className="tabs">
        <button
          className={scope === "main" ? "selected" : ""}
          onClick={() => {
            setScope("main");
            setCategory("All");
          }}
        >
          Crypto perpetuals
        </button>
        <button
          className={scope === "global" ? "selected" : ""}
          onClick={() => {
            setScope("global");
            setCategory("All");
          }}
        >
          Builder DEX markets
        </button>
      </div>
      <DataState resource={r} />
      {selected && (
        <div className="notice">
          <Link
            className="text-link"
            href={`/setups?coin=${encodeURIComponent(selected)}`}
          >
            Trade setup · wallet bias, stop-loss, targets and your risk budget{" "}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
      {selected && <TokenDesk key={selected} coin={selected} />}
      <AssetPulse />
      {scope === "global" && (
        <div className="notice">
          Coverage: first three registered builder DEXs. These are derivative
          instruments; exposure does not imply ownership of an underlying stock
          or commodity.{" "}
          {r.data?.data?.coverage
            ?.map((d: any) => `${d.dex}: ${d.ok ? "available" : "unavailable"}`)
            .join(" · ")}
        </div>
      )}
      {current && (
        <>
          <div className="stats">
            <Stat
              label="Mark price"
              value={price(current.price)}
              detail={`${pct(current.change)} over 24 hours`}
            />
            <Stat
              label="24H volume"
              value={money(current.volume)}
              detail="Traded notional"
            />
            <Stat
              label="Open interest"
              value={money(current.openInterest)}
              detail="Outstanding notional"
            />
            <Stat
              label="Funding / hour"
              value={`${(current.funding * 100).toFixed(4)}%`}
              detail={
                current.funding >= 0 ? "Longs pay shorts" : "Shorts pay longs"
              }
            />
          </div>
          {!current.dex && (
            <div className="two-columns">
              <section className="panel">
                <div className="panel-head">
                  <h2>Seven-day price history</h2>
                  <span className="pill">1H</span>
                </div>
                <DataState resource={chart} />
                {chart.data && <Chart data={chart.data.data} />}
              </section>
              <section className="panel research-card">
                <span className="eyebrow">CROSS-EXCHANGE CHECK</span>
                <h2>Hyperliquid × Bybit</h2>
                {bybit ? (
                  <>
                    <dl className="facts">
                      <div>
                        <dt>HL mark / USD</dt>
                        <dd>{price(current.price)}</dd>
                      </div>
                      <div>
                        <dt>Bybit last trade / USDT</dt>
                        <dd>{price(bybit.price)}</dd>
                      </div>
                      <div>
                        <dt>Indicative price difference</dt>
                        <dd>{pct((current.price / bybit.price - 1) * 100)}</dd>
                      </div>
                    </dl>
                    <p className="muted">
                      Different price types, quote currencies and timestamps.
                      This is context, not an executable arbitrage quote.
                    </p>
                    <small className="muted">
                      Bybit updated {time(cross.data.updatedAt)}
                      {cross.data.stale ? " · cached" : ""}
                    </small>
                  </>
                ) : (
                  <Empty
                    title={
                      cross.error
                        ? "CEX source unavailable"
                        : "Loading comparison"
                    }
                  >
                    {cross.error || "Checking the public Bybit market feed."}
                  </Empty>
                )}
              </section>
            </div>
          )}
        </>
      )}
      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search markets"
              placeholder="Find an asset"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label>
            Sector
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>All</option>
              {Array.from(new Set(markets.map((m: any) => m.category))).map(
                (c) => (
                  <option key={String(c)}>{String(c)}</option>
                ),
              )}
            </select>
          </label>
          <span className="muted">{rows.length} markets</span>
        </div>
        <MarketTable markets={rows} />
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Observed taker activity {selected ? `· ${selected}` : ""}</h2>
            <p>Retained trades in the last hour · selected live streams</p>
          </div>
          <Link className="text-link" href="/radar">
            Position radar <ArrowUpRight size={15} />
          </Link>
        </div>
        <DataState resource={tape} />
        {tape.data?.sums?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Taker buys</th>
                  <th>Taker sells</th>
                  <th>Difference</th>
                  <th>Trades</th>
                  <th>First retained trade</th>
                </tr>
              </thead>
              <tbody>
                {tape.data.sums.map((s: any) => (
                  <tr key={s.coin}>
                    <td>{s.coin}</td>
                    <td className="positive">{money(s.buy)}</td>
                    <td className="negative">{money(s.sell)}</td>
                    <td>{money(s.buy - s.sell)}</td>
                    <td>{s.trades}</td>
                    <td>{time(s.firstTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No retained trades for this selection">
            The collector subscribes to 12 high-volume main DEX markets. Keep
            the app running to collect activity.
          </Empty>
        )}
        <div className="panel-foot">
          Taker flow is trading pressure, not capital inflow/outflow. Collection
          gaps are not backfilled.
        </div>
      </section>
    </Terminal>
  );
}
