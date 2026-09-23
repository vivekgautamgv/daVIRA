"use client";
import { useState } from "react";
import Link from "next/link";
import { money, num, short, price } from "./terminal";
import { time } from "./ui";

export default function WatchlistSummary({ overview }: { overview: any }) {
  const [selected, setSelected] = useState("");
  const all = overview?.data || [];
  const rows = all.filter((w: any) => !selected || selected === w.address);
  const positions = rows.flatMap((w: any) =>
    (w.positions || []).map((p: any) => ({
      ...p,
      address: w.address,
      label: w.label,
    })),
  );
  const fresh = positions.filter((p: any) => !p.stale);
  const known = rows.some(
    (w: any) => w.updatedAt && Date.now() - w.updatedAt < 180000,
  );
  const sum = (side: number) =>
    fresh
      .filter((p: any) => Math.sign(p.size) === side)
      .reduce((s: number, p: any) => s + Math.abs(p.value), 0);
  const alerts = (overview?.alerts || []).filter(
    (a: any) => !selected || a.address === selected,
  );
  const orders = rows.flatMap((w: any) =>
    (w.activity?.orders || []).map((o: any) => ({
      ...o,
      address: w.address,
      at: w.activity.ordersAt,
    })),
  );
  const wallet = (address: string) => (
    <Link href={`/wallet/${address}`}>
      {all.find((w: any) => w.address === address)?.label || short(address)}
    </Link>
  );
  return (
    <section className="panel watch-summary">
      <div className="panel-head">
        <div>
          <h2>What your wallets are doing</h2>
          <p className="muted">
            Positions, pending orders and trade alerts in one view.
          </p>
        </div>
        <label>
          Wallet scope
          <select
            aria-label="Summary wallet"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">All followed wallets</option>
            {all.map((w: any) => (
              <option key={w.address} value={w.address}>
                {w.label || short(w.address)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {overview?.paused && (
        <p className="notice">
          Collection is paused. These are saved observations.
        </p>
      )}
      <div className="watch-metrics">
        {[
          [
            "Long exposure",
            known || fresh.length ? money(sum(1)) : "Awaiting snapshot",
          ],
          [
            "Short exposure",
            known || fresh.length ? money(sum(-1)) : "Awaiting snapshot",
          ],
          ["Open positions", `${positions.length} observed`],
          ["Activity alerts", `${alerts.length} recent`],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="subtle-note">
        Exposure totals include only positions checked within three minutes.
        Coverage may be partial; stale positions remain visible below.
      </p>
      <div className="watch-briefs">
        {rows.map((w: any) => (
          <div key={w.address}>
            <strong>{wallet(w.address)}</strong>
            <p>
              {w.updatedAt
                ? `${w.positions.length} observed positions · main equity ${money(w.account?.equity)}`
                : "Awaiting account snapshot"}
            </p>
            <small className="muted">
              Account: {w.updatedAt ? time(w.updatedAt) : "not checked"} ·
              Orders:{" "}
              {w.activity?.ordersAt ? time(w.activity.ordersAt) : "pending"} ·
              Fills:{" "}
              {w.activity?.fillsAt ? time(w.activity.fillsAt) : "pending"}
            </small>
            {w.activity?.issues?.map((issue: string) => (
              <p className="notice" key={issue}>
                {issue}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="panel-head">
        <h3>Combined open positions</h3>
      </div>
      {positions.length ? (
        <div className="table-scroll watch-table">
          <table>
            <thead>
              <tr>
                {[
                  "Wallet",
                  "Coin / venue",
                  "Direction",
                  "Size",
                  "Exposure",
                  "Entry",
                  "Unrealized PnL",
                  "Snapshot",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((p: any) => (
                <tr key={`${p.address}:${p.venue}:${p.coin}`}>
                  <td>{wallet(p.address)}</td>
                  <td>
                    <Link href={`/coins?coin=${encodeURIComponent(p.coin)}`}>
                      {p.coin}
                    </Link>
                    <small className="muted"> {p.venue}</small>
                  </td>
                  <td className={p.size > 0 ? "positive" : "negative"}>
                    {p.size > 0 ? "Long" : "Short"}
                  </td>
                  <td>{num(Math.abs(p.size))}</td>
                  <td>{money(p.value)}</td>
                  <td>{price(p.entry)}</td>
                  <td>{money(p.unrealized)}</td>
                  <td>
                    {p.observedAt ? time(p.observedAt) : "Unknown"}
                    {p.stale && <span className="badge">Stale · excluded</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="subtle-note">
          {known
            ? "No open positions in the available snapshots."
            : "Position data is pending. Add a wallet to begin tracking."}
        </p>
      )}
      <div className="panel-head">
        <h3>Pending orders</h3>
        <span className="muted">Main DEX + spot</span>
      </div>
      {orders.length ? (
        <div className="table-scroll watch-table">
          <table>
            <thead>
              <tr>
                {[
                  "Wallet",
                  "Coin",
                  "Side / type",
                  "Remaining size",
                  "Limit price",
                  "Checked",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={`${o.address}:${o.oid}`}>
                  <td>{wallet(o.address)}</td>
                  <td>{o.coin.startsWith("@") ? `Spot market ${o.coin}` : o.coin}</td>
                  <td>
                    {o.side === "B" ? "Buy" : "Sell"} · {o.orderType}
                    {o.reduceOnly ? " · Reduce only" : ""}
                  </td>
                  <td>{o.sz}</td>
                  <td>{price(Number(o.limitPx))}</td>
                  <td>
                    {time(o.at)}
                    {Date.now() - o.at > 180000 ? " · Stale" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="subtle-note">
          {rows.every((w: any) => w.activity?.ordersAt) && rows.length
            ? "No pending orders in the last returned snapshots."
            : "Order snapshots are pending."}
        </p>
      )}
      <div className="panel-head">
        <h3>Order & trade alerts</h3>
        <span className="badge">Automatic · in-app</span>
      </div>
      <div className="watch-alerts" aria-live="polite">
        {alerts.length ? (
          alerts.map((a: any) => (
            <article key={a.id}>
              <div>
                <span className="badge">
                  {a.type === "watch_fill"
                    ? "Executed trade"
                    : a.type === "watch_order"
                      ? "New order"
                      : "Position change"}
                </span>{" "}
                {wallet(a.address)}{" "}
                <time className="muted">{time(a.time)}</time>
              </div>
              <h4>{a.title}</h4>
              <p className="muted">{a.detail}</p>
            </article>
          ))
        ) : (
          <p className="subtle-note">
            Monitoring starts when this wallet is first checked. New orders,
            fills and position changes will appear here automatically.
          </p>
        )}
      </div>
      <p className="subtle-note">
        {overview?.coverage} Checks rotate through followed wallets, typically
        every 30 seconds for one wallet and several minutes for a full
        watchlist. Alerts arrive after detection, while the collector is
        running.
      </p>
    </section>
  );
}
