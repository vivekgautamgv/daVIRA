"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  ArrowDownLeft,
  ArrowUpRight as OutIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import Terminal, { useData, Empty, money, num, short } from "./terminal";
import { DataState, time } from "./ui";
import FlowResearch from "./flow-research";
export default function Flows() {
  return (
    <Suspense
      fallback={<div className="loading-line">Loading coin flows…</div>}
    >
      <Content />
    </Suspense>
  );
}
function Content() {
  const params = useSearchParams(),
    [window, setWindow] = useState("24h"),
    [coin, setCoin] = useState(params.get("coin") || ""),
    [q, setQ] = useState(""),
    [sector, setSector] = useState("all");
  const [cohort, setCohort] = useState("whales");
  useEffect(() => {
    setCoin(params.get("coin") || "");
  }, [params]);
  const r = useData(
      `flows?window=${window}&coin=${encodeURIComponent(coin)}&cohort=${cohort}`,
      20000,
    ),
    d = r.data,
    rows = (d?.data || []).filter(
      (c: any) =>
        c.coin.toLowerCase().includes(q.toLowerCase()) &&
        (sector === "all" || c.class === sector),
    ),
    inflow = rows.reduce((n: number, c: any) => n + c.inflow, 0),
    outflow = rows.reduce((n: number, c: any) => n + c.outflow, 0);
  return (
    <Terminal view="flows">
      <div className="screener-heading">
        <div>
          <span className="eyebrow">SMART MONEY / COIN FLOWS</span>
          <h1>{coin || "Coin"} inflow & outflow</h1>
          <p>
            Find where indexed wallets are adding exposure—and where they are
            exiting.
          </p>
        </div>
        <div className="time-switch">
          {["1h", "6h", "24h", "7d"].map((w) => (
            <button
              className={window === w ? "active" : ""}
              key={w}
              onClick={() => setWindow(w)}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <DataState resource={r} />
      <div className="cohort-switch" aria-label="Flow research cohort">
        {[
          ["whales", "Large wallets"],
          ["quality", "Quality ≥ 60"],
          ["watchlist", "My watchlist"],
          ["all", "All indexed"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={cohort === id ? "active" : ""}
            onClick={() => setCohort(id)}
          >
            {label}
          </button>
        ))}
        <span>{d?.coverage.eligibleWallets ?? "—"} eligible wallets</span>
      </div>
      <p className="muted small cohort-definition">
        {d?.coverage.cohortDefinition || "Loading cohort criteria…"}
      </p>
      <div className="flow-metrics">
        <div>
          <span>
            <ArrowDownLeft size={13} />
            Position inflow
          </span>
          <b className="positive">{d ? money(inflow, 1) : "—"}</b>
          <small>New long + new short notional</small>
        </div>
        <div>
          <span>
            <OutIcon size={13} />
            Position outflow
          </span>
          <b className="negative">{d ? money(outflow, 1) : "—"}</b>
          <small>Closed long + closed short notional</small>
        </div>
        <div>
          <span>Net position growth</span>
          <b>{d ? money(inflow - outflow, 1) : "—"}</b>
          <small>Inflow less outflow</small>
        </div>
        <div>
          <span>Wallets contributing</span>
          <b>
            {d?.coverage.wallets ?? "—"}
            <em> / {d?.coverage.eligibleWallets ?? "—"}</em>
          </b>
          <small>Contributing / eligible cohort wallets</small>
        </div>
      </div>
      <div className="flow-definition">
        <span className="pill">NOTIONAL EXPOSURE</span>
        <p>
          These flows measure opening and closing positions. They are not
          deposits or withdrawals of collateral. Each total can be traced to
          wallet executions.
        </p>
      </div>
      <FlowResearch rows={d?.data || []} coin={coin} onSelect={setCoin} />
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              {coin
                ? `${coin} exposure rotation`
                : "Exposure rotation across indexed wallets"}
            </h2>
            <p>
              Inflow above zero · outflow below zero · {window} query window
            </p>
          </div>
          {coin && (
            <button className="button" onClick={() => setCoin("")}>
              All coins
            </button>
          )}
        </div>
        {d?.timeline.length ? (
          <div className="flow-chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={d.timeline.map((p: any) => ({
                  ...p,
                  outflow: -p.outflow,
                }))}
              >
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleString(undefined, {
                      month: window === "7d" ? "short" : undefined,
                      day: window === "7d" ? "numeric" : undefined,
                      hour: "2-digit",
                    })
                  }
                  axisLine={false}
                  tickLine={false}
                  minTickGap={70}
                  tick={{ fill: "#8c9ca4", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#172024",
                    border: "1px solid #344147",
                    color: "#eee",
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => time(Number(v))}
                  formatter={(v: any, n: any) => [
                    money(Math.abs(Number(v))),
                    n === "inflow" ? "Position inflow" : "Position outflow",
                  ]}
                />
                <ReferenceLine y={0} stroke="#425057" />
                <Bar dataKey="inflow" fill="#a4cb87" maxBarSize={30} />
                <Bar dataKey="outflow" fill="#b87e85" maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty title="Building the execution sample">
            Wallet histories are indexed in the background. Analyze a wallet
            from the screener to prioritize it.
          </Empty>
        )}
      </section>
      <section className="panel">
        <div className="toolbar screener-filters">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Search coin flows"
              placeholder="Search coin or instrument"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label>
            Asset class
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="all">All classes</option>
              {[
                "Crypto",
                "Equity",
                "Index",
                "Commodity",
                "FX",
                "RWA token",
                "Builder / unclassified",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <span className="muted small">
            Click a market to inspect the contributing wallets
          </span>
        </div>
        <div className="table-scroll dense-table">
          <table>
            <thead>
              <tr>
                <th>Market / class</th>
                <th>New longs</th>
                <th>Closed longs</th>
                <th>New shorts</th>
                <th>Closed shorts</th>
                <th>Total inflow</th>
                <th>Total outflow</th>
                <th>Net growth</th>
                <th>Builders L / S</th>
                <th>Wallets</th>
                <th>Activity character</th>
                <th>Top wallet share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: any) => (
                <tr
                  key={c.coin}
                  className={coin === c.coin ? "selected-row" : ""}
                >
                  <td>
                    <button
                      className="asset-pick coin-pick"
                      onClick={() => setCoin(c.coin)}
                    >
                      <b>{c.coin}</b>
                      <small>{c.class}</small>
                    </button>
                  </td>
                  <td>{money(c.longIn, 1)}</td>
                  <td>{money(c.longOut, 1)}</td>
                  <td>{money(c.shortIn, 1)}</td>
                  <td>{money(c.shortOut, 1)}</td>
                  <td className="positive">{money(c.inflow, 1)}</td>
                  <td className="negative">{money(c.outflow, 1)}</td>
                  <td className={c.net >= 0 ? "positive" : "negative"}>
                    {money(c.net, 1)}
                  </td>
                  <td>
                    <span className="positive">{c.longBuilders}</span> /{" "}
                    <span className="negative">{c.shortBuilders}</span>
                  </td>
                  <td>{c.wallets}</td>
                  <td>{c.insight?.behavior}</td>
                  <td>{c.insight?.leaderShare?.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <Empty title="No matching indexed executions">
              Try a wider time window or allow more wallets to be indexed.
            </Empty>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              {coin
                ? `${coin}: wallets behind the flows`
                : "Largest wallet contributions"}
            </h2>
            <p>
              Ranked by total opening and closing notional within the selected
              window
            </p>
          </div>
          <Link className="text-link" href="/discover">
            Screen these wallets <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="table-scroll dense-table">
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Market</th>
                <th>Long inflow / outflow</th>
                <th>Short inflow / outflow</th>
                <th>Net position growth</th>
                <th>Realized less fees</th>
                <th>Fills</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d?.wallets.slice(0, 30).map((w: any) => (
                <tr key={`${w.address}:${w.coin}`}>
                  <td>
                    <Link href={`/wallet/${w.address}`}>
                      {short(w.address)}
                    </Link>
                  </td>
                  <td>{w.coin}</td>
                  <td>
                    <span className="positive">{money(w.longIn, 1)}</span> /{" "}
                    {money(w.longOut, 1)}
                  </td>
                  <td>
                    <span className="negative">{money(w.shortIn, 1)}</span> /{" "}
                    {money(w.shortOut, 1)}
                  </td>
                  <td>{money(w.net, 1)}</td>
                  <td className={w.samplePnl >= 0 ? "positive" : "negative"}>
                    {money(w.samplePnl, 1)}
                  </td>
                  <td>{w.executions}</td>
                  <td>
                    <Link className="text-link" href={`/wallet/${w.address}`}>
                      Inspect <ArrowUpRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!d?.wallets.length && (
          <Empty title="Contributors appear after indexing" />
        )}
      </section>
      <details className="methodology">
        <summary>Flow definitions & collection coverage</summary>
        <p>{d?.coverage.note}</p>
        <p>
          Earliest returned execution in this window: {time(d?.coverage.first)}.
          Latest: {time(d?.coverage.last)}. History is sampled from recent API
          responses, not a full-chain historical index. A wallet buying to close
          a short is counted as short outflow, not long inflow.
        </p>
      </details>
    </Terminal>
  );
}
