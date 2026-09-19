"use client";
import Link from "next/link";
import { useData, money, Empty } from "./terminal";
import { DataState, time } from "./ui";
export default function VenueBalances({ address }: { address: string }) {
  const r = useData(`analysis/${address}`, 20000),
    a = r.data?.data;
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Covered venues & builder positions</h2>
          <Link className="button" href={`/copy?wallet=${address}`}>
            Review for paper copying ↗
          </Link>
          <p>
            A zero main-DEX balance does not establish that funds left this
            wallet.
          </p>
        </div>
      </div>
      <DataState resource={r} />
      {a ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>Equity</th>
                  <th>Margin in use</th>
                  <th>Snapshot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Main Hyperliquid</td>
                  <td>{money(a.risk.mainEquity)}</td>
                  <td>
                    {a.risk.marginUtilization == null
                      ? "—"
                      : `${a.risk.marginUtilization.toFixed(1)}%`}
                  </td>
                  <td>
                    {time(a.positionsAt)} {a.positionsStale ? "Stale" : ""}
                  </td>
                </tr>
                {a.builderCoverage.map((v: any) => (
                  <tr key={v.dex}>
                    <td>{v.dex}</td>
                    <td>
                      {v.equity == null ? "Not yet verified" : money(v.equity)}
                    </td>
                    <td>{v.marginUsed == null ? "—" : money(v.marginUsed)}</td>
                    <td>
                      {v.available
                        ? `${time(v.updatedAt)} ${v.stale ? "Stale" : ""}`
                        : "Unavailable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Builder market</th>
                  <th>Direction</th>
                  <th>Notional</th>
                  <th>Unrealized PnL</th>
                </tr>
              </thead>
              <tbody>
                {a.positions
                  .filter((p: any) => p.coin.includes(":"))
                  .map((p: any) => (
                    <tr key={p.coin}>
                      <td>
                        <Link
                          href={`/coins?coin=${encodeURIComponent(p.coin)}`}
                        >
                          {p.coin}
                        </Link>
                      </td>
                      <td>{p.size > 0 ? "Long" : "Short"}</td>
                      <td>{money(p.value)}</td>
                      <td>{money(p.unrealized)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="panel-foot">
            First three registered builder DEXs only. Spot balances and other
            venues are outside coverage. Missing balances are never treated as
            zero. Historical activity alone does not prove current funding.
          </div>
        </>
      ) : (
        <Empty title="Venue analysis queued">
          The account will appear after the background worker finishes.
        </Empty>
      )}
    </section>
  );
}
