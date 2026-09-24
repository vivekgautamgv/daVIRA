"use client";
import { useState } from "react";
import Link from "next/link";
import Terminal, { useData, Heading, Stat, short, Empty } from "../terminal";
import { DataState, time, useAction, Feedback, mutate, download } from "../ui";
const age = (ms: number | null) =>
  ms == null
    ? "Unknown"
    : ms < 3600000
      ? `${Math.floor(ms / 60000)}m`
      : `${(ms / 3600000).toFixed(1)}h`;
export default function Coverage() {
  const r = useData("coverage", 20000),
    d = r.data,
    action = useAction();
  const [scope, setScope] = useState("Pilot"),
    [query, setQuery] = useState(""),
    [address, setAddress] = useState("");
  const rows = (d?.rows || []).filter(
    (w: any) =>
      (scope === "All" ||
        (scope === "Pilot" && w.pilot) ||
        (scope === "Overdue" && w.overdue) ||
        (scope === "Failed" && w.error)) &&
      w.address.includes(query.trim().toLowerCase()),
  );
  const change = (address: string, add: boolean) =>
    action.run(
      async () => {
        await mutate("coverage/pilot", { address, add });
        await r.reload();
      },
      add
        ? "Wallet added to the pilot queue"
        : "Removed from pilot; observed history retained",
    );
  return (
    <Terminal view="coverage">
      <Heading
        eyebrow="V2 / EVIDENCE OPERATIONS"
        title="Know what your data can support."
        text="A bounded research universe, an observable refresh queue, and a record of every collection attempt."
      />
      <DataState resource={r} />
      <Feedback action={action} />
      {d && (
        <>
          <div className="stats">
            <Stat
              label="Pilot freshness"
              value={`${d.summary.pilotFresh} / ${d.summary.pilot}`}
              detail="Fill analyses retrieved within 1h"
            />
            <Stat
              label="Refresh success · 24h"
              value={
                d.collection.successRate == null
                  ? "—"
                  : `${d.collection.successRate.toFixed(1)}%`
              }
              detail={`${d.collection.attempts} recorded attempts`}
            />
            <Stat
              label="Overdue priority wallets"
              value={String(d.summary.overdue)}
              detail="Pilot or watchlist older than 1h"
            />
            <Stat
              label="Response cap reached"
              value={String(d.summary.capped)}
              detail="Latest response may omit executions"
            />
          </div>
          <div className="two-columns">
            <section className="panel research-card">
              <span className="eyebrow">BOUNDED COLLECTION</span>
              <h2>20-wallet pilot</h2>
              <p>
                Target a refresh every 30 minutes, subject to source limits.
                Followed wallets and explicit research requests have higher
                priority. Discovery receives a turn after four background
                priority jobs.
              </p>
              <dl className="facts">
                <div>
                  <dt>Study started</dt>
                  <dd>{time(d.studyStartedAt)}</dd>
                </div>
                <div>
                  <dt>Collection state</dt>
                  <dd>{d.paused ? "Paused" : "Running"}</dd>
                </div>
                <div>
                  <dt>Queued analyses</dt>
                  <dd>{d.summary.queued}</dd>
                </div>
                <div>
                  <dt>Successful refresh duration · p95</dt>
                  <dd>
                    {d.collection.p95DurationMs == null
                      ? "Not measured"
                      : `${(d.collection.p95DurationMs / 1000).toFixed(1)}s`}
                  </dd>
                </div>
              </dl>
              <small>
                This measures request-to-analysis duration, not trade-alert
                latency. The pilot is initially selected from demonstrated token
                records and recently active indexed wallets, then its membership
                stays fixed until you edit it.
              </small>
            </section>
            <section className="panel research-card">
              <span className="eyebrow">RESEARCH UNIVERSE</span>
              <h2>Choose the wallets to follow closely</h2>
              <p>
                {d.summary.pilot} / 20 pilot slots used. Removing a wallet frees
                a slot and retains its history.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void change(address, true);
                }}
                className="brief-filters"
              >
                <input
                  aria-label="Pilot wallet address"
                  placeholder="0x wallet address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  pattern="0x[a-fA-F0-9]{40}"
                />
                <button
                  className="button primary"
                  disabled={action.busy || d.summary.pilot >= 20}
                >
                  Add to pilot
                </button>
              </form>
              <div className="inline" style={{ marginTop: 20 }}>
                <button
                  className="button"
                  onClick={() =>
                    download(
                      "davira-coverage.json",
                      JSON.stringify(d, null, 2),
                      "application/json",
                    )
                  }
                >
                  Export coverage
                </button>
                <Link className="button" href="/settings">
                  Collector controls ↗
                </Link>
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">SOURCE-LEVEL VISIBILITY</span>
                <h2>Wallet coverage</h2>
              </div>
              <span>
                {rows.length} wallets · {time(d.updatedAt)}
              </span>
            </div>
            <div className="panel-foot brief-filters">
              <select
                aria-label="Coverage filter"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                {["Pilot", "All", "Overdue", "Failed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                aria-label="Search coverage wallets"
                placeholder="Search wallet address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div
              className="table-scroll"
              style={{ maxHeight: 560, overflow: "auto" }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Wallet / tier</th>
                    <th>Fill snapshot age</th>
                    <th>Observed history</th>
                    <th>Indexed fills</th>
                    <th>Complete episodes</th>
                    <th>Coverage issues</th>
                    <th>Pilot</th>
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
                          {short(w.address)}
                        </Link>
                        <small className="brief-sub">
                          {w.tier}
                          {w.pilot && w.tier !== "Pilot" ? " · Pilot" : ""}
                        </small>
                      </td>
                      <td className={w.fresh ? "positive" : "negative"}>
                        {age(w.ageMs)}
                        <small className="brief-sub">
                          {w.queuedAt
                            ? `Queued · ${w.attempts} retries`
                            : "Not queued"}
                        </small>
                      </td>
                      <td>
                        {time(w.first)}
                        <small className="brief-sub">to {time(w.last)}</small>
                      </td>
                      <td>{w.fills.toLocaleString()}</td>
                      <td>{w.completeTrades}</td>
                      <td>
                        {w.issues.join(" · ") || "No detected issues"}
                        <small className="brief-sub">
                          {w.gaps == null
                            ? "Discontinuities unknown"
                            : `${w.gaps} detected discontinuities`}
                        </small>
                        {w.error && (
                          <small className="brief-flag">{w.error}</small>
                        )}
                      </td>
                      <td>
                        <button
                          className="text-link"
                          disabled={
                            action.busy || (!w.pilot && d.summary.pilot >= 20)
                          }
                          onClick={() => void change(w.address, !w.pilot)}
                        >
                          {w.pilot ? "Remove" : "Add"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <Empty title="No wallets in this view">
                Change the filter or add a wallet to the pilot.
              </Empty>
            )}
            <div className="panel-foot">
              Freshness is not completeness. API response caps, archive
              retention and missed polling intervals can leave missing history
              even when the latest request succeeds.
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Collection journal</h2>
              <span>Latest 30 attempts · retained 14 days</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Finished</th>
                    <th>Wallet</th>
                    <th>Result</th>
                    <th>Duration</th>
                    <th>Returned fills</th>
                    <th>Source timestamp / error</th>
                  </tr>
                </thead>
                <tbody>
                  {d.collection.recent.map((run: any) => (
                    <tr key={run.id}>
                      <td>{time(run.finished_at)}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/wallet/${run.address}`}
                        >
                          {short(run.address)}
                        </Link>
                      </td>
                      <td className={run.success ? "positive" : "negative"}>
                        {run.success ? "Collected" : "Failed"}
                        {run.capped ? " · cap reached" : ""}
                      </td>
                      <td>
                        {((run.finished_at - run.started_at) / 1000).toFixed(1)}
                        s
                      </td>
                      <td>{run.fills ?? "—"}</td>
                      <td>{run.error || time(run.source_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!d.collection.recent.length && (
              <Empty title="Measurement starts with the next refresh">
                Earlier collection attempts are not reconstructed.
              </Empty>
            )}
          </section>
        </>
      )}
    </Terminal>
  );
}
