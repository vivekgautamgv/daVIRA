"use client";
import { Download, Pause, Play, ExternalLink } from "lucide-react";
import Terminal, { useData, Heading, Stat, num } from "./terminal";
import { mutate, useAction, Feedback, DataState, download, time } from "./ui";
export default function Settings() {
  const r = useData("status", 10000),
    action = useAction(),
    d = r.data;
  return (
    <Terminal view="settings">
      <Heading
        eyebrow="LOCAL WORKSPACE"
        title="Data & settings"
        text="Inspect source health, collector coverage and your local storage."
      />
      <DataState resource={r} />
      <Feedback action={action} />
      {d && (
        <>
          <div className="stats">
            <Stat
              label="Trade stream"
              value={d.health.websocket}
              detail={`${d.health.streams?.length || 0} subscribed markets`}
            />
            <Stat
              label="Retained trades"
              value={num(d.tradeCount)}
              detail="24h or 100,000 trade cap"
            />
            <Stat
              label="Database size"
              value={`${(d.databaseBytes / 1024 / 1024).toFixed(1)} MB`}
              detail="SQLite database file; excludes WAL"
            />
            <Stat
              label="API requests"
              value={num(d.health.requests)}
              detail="Since this collector started"
            />
          </div>
          <div className="two-columns">
            <section className="panel research-card">
              <h2>Collector controls</h2>
              <dl className="facts">
                <div>
                  <dt>First collection</dt>
                  <dd>{time(d.firstCollectedAt)}</dd>
                </div>
                <div>
                  <dt>Latest trade</dt>
                  <dd>{time(d.health.lastTrade)}</dd>
                </div>
                <div>
                  <dt>Latest market snapshot</dt>
                  <dd>{time(d.health.lastMarket)}</dd>
                </div>
                <div>
                  <dt>Most recent connection gap</dt>
                  <dd>{d.lastGapAt ? time(d.lastGapAt) : "None recorded"}</dd>
                </div>
                <div>
                  <dt>Watched wallets</dt>
                  <dd>
                    {d.watchCount} / {d.limits.watchlist}
                  </dd>
                </div>
                <div>
                  <dt>Execution analysis</dt>
                  <dd>
                    {d.indexing?.indexed ?? 0} indexed ·{" "}
                    {d.indexing?.queued ?? 0} queued
                  </dd>
                </div>
              </dl>
              <div className="inline">
                <button
                  className="button"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(
                      async () => {
                        await mutate("settings", { paused: !d.paused });
                        await r.reload();
                      },
                      d.paused ? "Collector resumed" : "Collector paused",
                    )
                  }
                >
                  {d.paused ? <Play size={16} /> : <Pause size={16} />}{" "}
                  {d.paused ? "Resume" : "Pause"} collection
                </button>
                <button
                  className="button"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      const res = await fetch("/api/engine/export");
                      if (!res.ok) throw Error("Export failed");
                      download(
                        "davira-workspace.json",
                        JSON.stringify(await res.json(), null, 2),
                        "application/json",
                      );
                    }, "Workspace export prepared")
                  }
                >
                  <Download size={16} />
                  Export workspace
                </button>
              </div>
              <p className="muted">
                Pausing stops background observations and the trade stream.
                Browsing still fetches market snapshots. Exports include
                watchlists, saved screens, rules and paper trades; use the
                backup script for a full database copy.
              </p>
            </section>
            <section className="panel research-card">
              <h2>Cost & coverage</h2>
              <p>
                No paid services or exchange keys are required for this local
                edition. The collector runs while this app is running.
              </p>
              <dl className="facts">
                <div>
                  <dt>Wallet polling</dt>
                  <dd>About 60 seconds</dd>
                </div>
                <div>
                  <dt>Market cache</dt>
                  <dd>30 seconds</dd>
                </div>
                <div>
                  <dt>Wallet history</dt>
                  <dd>90 days</dd>
                </div>
                <div>
                  <dt>Alert history</dt>
                  <dd>30 days</dd>
                </div>
                <div>
                  <dt>Live trading</dt>
                  <dd>Not enabled</dd>
                </div>
              </dl>
              <p className="muted">
                This is a single-user local workspace. Public subscriptions,
                isolated customer accounts, automated copying and billing are
                deployment-stage work.
              </p>
            </section>
          </div>
          <section className="panel">
            <div className="panel-head">
              <h2>Source connections</h2>
            </div>
            <div className="source-list">
              {d.sources.map((s: any) => (
                <a href={s.url} target="_blank" rel="noreferrer" key={s.name}>
                  <div>
                    <b>{s.name}</b>
                    <p>{s.purpose}</p>
                  </div>
                  <ExternalLink size={16} />
                </a>
              ))}
            </div>
          </section>
          {Object.keys(d.health.failures).length > 0 && (
            <section className="panel research-card">
              <h2>Recent source issues</h2>
              {Object.entries(d.health.failures).map(([key, value]: any) => (
                <div className="failure" key={key}>
                  <b>{key}</b>
                  <p>
                    {value.message} · {time(value.time)}
                  </p>
                </div>
              ))}
            </section>
          )}
          <div className="subtle-note">
            Stream markets:{" "}
            {d.health.streams?.join(" · ") || "Waiting for subscriptions"}
          </div>
        </>
      )}
    </Terminal>
  );
}
