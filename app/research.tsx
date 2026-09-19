"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Download, CalendarDays } from "lucide-react";
import Terminal, {
  useData,
  Heading,
  Empty,
  Stat,
  money,
  price,
  short,
  pct,
} from "./terminal";
import { DataState, time, download, CoinSelect } from "./ui";
export function Events() {
  const r = useData("events", 3600000),
    news = useData("news", 900000),
    [major, setMajor] = useState(true);
  const rows = (r.data?.data || []).filter(
    (e: any) => !major || e.impact === "Major",
  );
  return (
    <Terminal view="calendar">
      <Heading
        eyebrow="CATALYST CALENDAR"
        title="Events & announcements"
        text="Official schedules and primary-source updates. Times use your device’s time zone."
      />
      <div className="two-columns events-layout">
        <section className="panel">
          <div className="panel-head">
            <h2>Economic calendar</h2>
            <label className="check-label">
              <input
                type="checkbox"
                checked={major}
                onChange={(e) => setMajor(e.target.checked)}
              />
              Major releases
            </label>
          </div>
          <DataState resource={r} />
          <div className="event-list">
            {rows.slice(0, 35).map((e: any) => (
              <article key={e.id} className="event-item">
                <div className="date-box">
                  <b>{new Date(e.time).getDate()}</b>
                  <span>
                    {new Date(e.time).toLocaleString(undefined, {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="grow">
                  <span
                    className={`event-tag ${e.impact === "Major" ? "positive" : ""}`}
                  >
                    {e.type}
                  </span>
                  <h3>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.title} <ExternalLink size={12} />
                    </a>
                  </h3>
                  <p>
                    {time(e.time)} · {e.source}
                  </p>
                  <small className="muted">{e.timing}</small>
                </div>
                <span className="pill">
                  {e.time < Date.now()
                    ? "Past"
                    : e.time - Date.now() < 86400000
                      ? "Within 24h"
                      : `${Math.ceil((e.time - Date.now()) / 86400000)}d`}
                </span>
              </article>
            ))}
          </div>
          {!r.loading && !rows.length && (
            <Empty title="No matching releases">
              Try including all economic releases.
            </Empty>
          )}
          <div className="panel-foot">
            {r.data?.calendarNote ||
              "Schedules are loaded from the official sources."}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>From the source</h2>
            <span className="pill">ANNOUNCEMENTS</span>
          </div>
          <DataState resource={news} />
          <div className="news-list">
            {news.data?.data?.slice(0, 14).map((n: any) => (
              <a href={n.url} target="_blank" rel="noreferrer" key={n.url}>
                <span className="eyebrow">{n.source}</span>
                <h3>
                  {n.title}
                  <ExternalLink size={13} />
                </h3>
                <small>{time(n.time)}</small>
              </a>
            ))}
          </div>
          {news.data?.sources
            ?.filter((s: any) => !s.ok || s.stale)
            .map((s: any) => (
              <div key={s.name} className="notice error">
                {s.name}: {s.error || "Showing cached announcements"}
              </div>
            ))}
          <div className="panel-foot">
            Headlines link to the publisher. Social-media sentiment is not
            included in V1.
          </div>
        </section>
      </div>
    </Terminal>
  );
}
export function Reports() {
  return (
    <Suspense fallback={<div className="loading-line">Loading research…</div>}>
      <ReportContent />
    </Suspense>
  );
}
function ReportContent() {
  const params = useSearchParams(),
    [coin, setCoin] = useState(params.get("coin") || "BTC"),
    markets = useData("markets", 60000),
    r = useData(`reports?coin=${encodeURIComponent(coin)}`, 60000),
    d = r.data;
  return (
    <Terminal view="reports">
      <Heading
        eyebrow="EVIDENCE NOTEBOOK"
        title="Market research"
        text="Shared facts, clear scenarios and visible data coverage."
      >
        <a
          className="button"
          href={`/api/report-download?coin=${encodeURIComponent(coin)}`}
          download
        >
          <Download size={16} /> Export report
        </a>
      </Heading>
      <div className="toolbar panel">
        <label>
          Research market
          <CoinSelect
            markets={markets.data?.data || []}
            value={coin}
            onChange={setCoin}
          />
        </label>
        <span className="muted">
          Structured research · refreshed once a minute · no paid AI API
        </span>
      </div>
      <DataState resource={r} />
      {d && (
        <>
          <div className="stats">
            <Stat
              label="Mark price"
              value={price(d.asset.price)}
              detail={pct(d.asset.change) + " in 24h"}
            />
            <Stat
              label="7D range low"
              value={price(d.range.low)}
              detail="Observed hourly candles"
            />
            <Stat
              label="7D range high"
              value={price(d.range.high)}
              detail="Observed hourly candles"
            />
            <Stat
              label="Tracked positions"
              value={String(d.cohort.length)}
              detail="Your fresh watchlist sample"
            />
          </div>
          <div className="report-layout">
            <article className="panel report-body">
              <div className="report-meta">
                <span className="pill">SOURCE-BASED BRIEF</span>
                <span>{time(d.updatedAt)}</span>
              </div>
              <h2>{coin}: market & positioning brief</h2>
              {d.sections.map((s: any, i: number) => (
                <section key={s.title}>
                  <span className="section-number">0{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </section>
              ))}
            </article>
            <aside>
              <section className="panel research-card">
                <h2>Evidence sources</h2>
                {d.sources.map((s: any) => (
                  <a
                    className="source-link"
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    key={s.url}
                  >
                    {s.title}
                    <ExternalLink size={15} />
                  </a>
                ))}
                <p className="muted">
                  Every brief is generated from the same stored market snapshot
                  shown above.
                </p>
              </section>
              <section className="panel research-card">
                <h2>Your wallet sample</h2>
                {d.cohort.length ? (
                  d.cohort.map((w: any) => (
                    <div className="cohort-item" key={w.address}>
                      <Link href={`/wallet/${w.address}`}>
                        {w.label || short(w.address)}
                      </Link>
                      <span className={w.size > 0 ? "positive" : "negative"}>
                        {w.size > 0 ? "Long" : "Short"} {money(w.value)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    No fresh tracked position in {coin}. Add relevant wallets to
                    build your own cohort.
                  </p>
                )}
                <Link className="text-link" href="/watchlist">
                  Manage watchlist →
                </Link>
              </section>
            </aside>
          </div>
        </>
      )}
    </Terminal>
  );
}
