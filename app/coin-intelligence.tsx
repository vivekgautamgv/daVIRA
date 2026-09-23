"use client";
import Link from "next/link";
import { useData, money, short } from "./terminal";
import { DataState, time } from "./ui";
export default function CoinIntelligence({
  coin,
  window,
}: {
  coin: string;
  window: string;
}) {
  const r = useData(
      coin
        ? `coin-research?coin=${encodeURIComponent(coin)}&window=${window}`
        : null,
      20000,
    ),
    d = r.data;
  if (!coin)
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Coin intelligence</h2>
          <p className="muted">
            Select a coin below to compare positioning, wallet behaviour and
            trader cohorts.
          </p>
        </div>
      </section>
    );
  return (
    <section className="panel coin-intelligence">
      <div className="panel-head">
        <div>
          <span className="eyebrow">POSITIONING / BEHAVIOUR / COHORTS</span>
          <h2>{coin} positioning brief</h2>
          <p className="muted">
            {window} · All indexed wallets, independent of the flow-table cohort
            filter
          </p>
        </div>
        <span className="badge">Evidence-led research</span>
      </div>
      <DataState resource={r} />
      {d && (
        <>
          <div className="watch-metrics">
            {[
              ["New longs", "longIn"],
              ["Long reductions", "longOut"],
              ["New shorts", "shortIn"],
              ["Short covering", "shortOut"],
            ].map(([label, key]) => (
              <div key={key}>
                <span className="muted">{label}</span>
                <strong>
                  {d.coverage.wallets
                    ? money(d.components[key])
                    : "No observations"}
                </strong>
              </div>
            ))}
          </div>
          <div className="research-grid">
            <article>
              <span>PARTICIPATION</span>
              <strong>{d.coverage.wallets} wallets</strong>
              <p>
                {d.coverage.specialists} meet the coin-specialist evidence
                criteria. {d.insights.bullishWallets} increased signed exposure;{" "}
                {d.insights.bearishWallets} reduced it.
              </p>
            </article>
            <article>
              <span>CONCENTRATION</span>
              <strong>
                {d.insights.leaderShare == null
                  ? "—"
                  : `${d.insights.leaderShare.toFixed(1)}%`}
              </strong>
              <p>
                Activity from the largest contributor.{" "}
                {d.insights.leaderChangesDirection
                  ? "Removing this wallet reverses net buy/sell direction."
                  : "Net buy minus sell without this wallet: " +
                    money(d.insights.excludingLeader) +
                    "."}
              </p>
            </article>
            <article>
              <span>POSITION FOLLOW-THROUGH</span>
              <strong>
                {d.coverage.retained} / {d.coverage.checkedRetention}
              </strong>
              <p>
                Later fresh snapshots retain the last observed position
                direction. This does not prove uninterrupted holding; wallets
                without a later snapshot are excluded.
              </p>
            </article>
          </div>
          <div className="panel-head">
            <div>
              <h3>{d.agreement}</h3>
              <p className="muted">
                At least three active addresses per directional cohort. Groups
                overlap; do not add their totals.
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Cohort",
                    "Wallets",
                    "Long-leaning / short-leaning",
                    "New longs / exits",
                    "New shorts / covers",
                    "Reading",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.cohorts.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <details>
                        <summary>{c.label}</summary>
                        <p className="muted">{c.definition}</p>
                        <div>
                          {c.addresses.map((a: string) => (
                            <Link
                              className="badge"
                              key={a}
                              href={`/wallet/${a}`}
                            >
                              {short(a)} ↗{" "}
                            </Link>
                          ))}
                        </div>
                      </details>
                    </td>
                    <td>{c.count}</td>
                    <td>
                      {c.bull} / {c.bear}
                      <small className="muted"> · {c.neutral} unchanged</small>
                    </td>
                    <td>
                      {money(c.longIn)} / {money(c.longOut)}
                    </td>
                    <td>
                      {money(c.shortIn)} / {money(c.shortOut)}
                    </td>
                    <td>{c.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-head">
            <div>
              <h3>Wallet behaviour changes</h3>
              <p className="muted">
                {d.coverage.baselineReady} / {d.coverage.wallets} wallets have
                sufficient evidence for size comparisons. Executed orders, not
                pending intentions.
              </p>
            </div>
          </div>
          <div className="watch-alerts">
            {d.behaviors.length ? (
              d.behaviors.map((b: any, i: number) => (
                <article key={`${b.address}:${b.type}:${i}`}>
                  <span className="badge">{b.type}</span>{" "}
                  <Link href={`/wallet/${b.address}`}>
                    {short(b.address)} ↗
                  </Link>
                  <p>{b.detail}</p>
                  <small className="muted">
                    {time(b.time)}
                    {b.amount != null
                      ? ` · Executed ${money(b.amount)} · Prior median ${money(b.baseline)}`
                      : ""}
                  </small>
                </article>
              ))
            ) : (
              <p className="subtle-note">
                No qualifying behaviour changes in the observed window. Missing
                history is not evidence of normal behaviour.
              </p>
            )}
          </div>
          <details className="subtle-note">
            <summary>Evidence, contributors & methodology</summary>
            <p>{d.methodology}</p>
            <p>
              Fresh means within one hour. Cohort direction requires a
              signed-size vote imbalance of at least 34%; otherwise the result
              is mixed. These are descriptive thresholds, not validated
              predictive scores.
            </p>
            <p>
              Computed {time(d.updatedAt)}. Window begins {time(d.windowStart)}.
            </p>
            <div>
              {d.wallets.map((w: any) => (
                <Link
                  key={w.address}
                  className="badge"
                  href={`/wallet/${w.address}`}
                >
                  {short(w.address)}
                  {w.specialist ? " · coin specialist" : ""} ↗{" "}
                </Link>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}
