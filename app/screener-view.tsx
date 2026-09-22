"use client";
import WalletLookup from "./wallet-lookup";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  ArrowUpRight,
  RefreshCw,
  Save,
  Download,
  X,
  GitCompareArrows,
} from "lucide-react";
import Terminal, { useData, money, num, short, pct, Empty } from "./terminal";
import { DataState, useAction, mutate, Feedback, download, time } from "./ui";
export const duration = (ms: number | null) =>
  ms === null
    ? "—"
    : ms < 60000
      ? `${Math.round(ms / 1000)}s`
      : ms < 3600000
        ? `${Math.round(ms / 60000)}m`
        : ms < 86400000
          ? `${(ms / 3600000).toFixed(1)}h`
          : `${(ms / 86400000).toFixed(1)}d`;
export function Score({
  value,
  label = "Quality",
}: {
  value: number | null | undefined;
  label?: string;
}) {
  return value === null || value === undefined ? (
    <span className="muted">—</span>
  ) : (
    <div className="score-cell" title={`${label}: ${value}/100`}>
      <b className={value >= 65 ? "positive" : value < 40 ? "negative" : ""}>
        {value}
      </b>
      <span>
        <i
          style={{
            width: `${value}%`,
            background:
              value >= 65 ? "#b4d993" : value < 40 ? "#c4858a" : "#a7b8c3",
          }}
        />
      </span>
    </div>
  );
}
const defaults = {
  q: "",
  preset: "all",
  coin: "",
  sector: "all",
  minEquity: "0",
  maxEquity: "",
  minWinRate: "",
  maxInactiveHours: "",
  evidenceOnly: false,
  minPnl: "",
  minScore: "",
  minTrades: "",
  maxLeverage: "",
  minHold: "",
  sort: "quality",
  view: "performance",
  analyzed: false,
};
function matchesPreset(w: any, preset: string) {
  const a = w.analysis,
    s = a?.stats,
    risk = a?.risk;
  if (preset === "movers") return w.daily?.rankChange > 0;
  if (preset === "entrants") return w.daily?.status === "entered";
  if (preset === "consistent") return w.pnl7d > 0 && w.pnl30d > 0;
  if (preset === "quality") return s?.score >= 60 && s?.completeTrades >= 10;
  if (preset === "rwa")
    return (
      a?.eligibility?.active &&
      (a?.rwa.volume > 0 || a?.rwa.openPositions.length > 0)
    );
  if (preset === "copy") return a?.eligibility?.eligible;
  if (preset === "lowrisk")
    return (
      risk?.exposureMultiple != null &&
      risk.exposureMultiple <= 3 &&
      w.pnl30d > 0
    );
  if (preset === "specialist") return a?.coins[0]?.volumeShare >= 60;
  return true;
}
const presetNotes: Record<string, string> = {
  all: "Full discovery universe",
  movers: "Higher rank than yesterday · 30D PnL",
  entrants: "New to today’s observed ranking",
  consistent: "Positive in both periods",
  quality: "At least 10 complete episodes",
  rwa: "Recently active · verified funded venue",
  copy: "Funded · active · consistency & risk gates",
  lowrisk: "Main DEX · profitable 30D",
  specialist: "≥ 60% turnover in one coin",
};
export default function Screener({
  initialPreset = "all",
  initialView = "performance",
  activeView = "discover",
}: {
  initialPreset?: string;
  initialView?: string;
  activeView?: string;
}) {
  const r = useData("screener", 20000),
    screens = useData("screens"),
    action = useAction(),
    [f, setF] = useState({
      ...defaults,
      preset: initialPreset,
      view: initialView,
    }),
    [page, setPage] = useState(0),
    [advanced, setAdvanced] = useState(false),
    [name, setName] = useState(""),
    [saveOpen, setSaveOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [compare, setCompare] = useState(false);
  const update = (key: string, value: any) => {
    setF((p) => ({ ...p, [key]: value }));
    setPage(0);
  };
  const rows = useMemo(() => {
    const filtered = (r.data?.data || []).filter((w: any) => {
      const a = w.analysis,
        s = a?.stats,
        risk = a?.risk;
      if (
        !`${w.address} ${w.name || ""}`
          .toLowerCase()
          .includes(f.q.toLowerCase())
      )
        return false;
      if (Number(f.minEquity) > 0 && !(w.equity >= Number(f.minEquity)))
        return false;
      if (f.maxEquity && !(w.equity != null && w.equity <= Number(f.maxEquity)))
        return false;
      if (
        f.minWinRate &&
        !(s?.winRate != null && s.winRate >= Number(f.minWinRate))
      )
        return false;
      if (
        f.maxInactiveHours &&
        !(a?.coverage?.last > Date.now() - Number(f.maxInactiveHours) * 3600000)
      )
        return false;
      if (f.evidenceOnly && w.evidence?.status !== "Sample checks passed")
        return false;
      if (f.minPnl && !(w.pnl30d != null && w.pnl30d >= Number(f.minPnl)))
        return false;
      if (f.minScore && !(s?.score !== null && s?.score >= Number(f.minScore)))
        return false;
      if (f.minTrades && !(s?.completeTrades >= Number(f.minTrades)))
        return false;
      if (
        f.maxLeverage &&
        !(
          risk?.exposureMultiple !== null &&
          risk?.exposureMultiple <= Number(f.maxLeverage)
        )
      )
        return false;
      if (f.minHold && !(s?.medianHoldMs >= Number(f.minHold) * 60000))
        return false;
      if (f.analyzed && !a) return false;
      if (
        f.coin &&
        !a?.coins.some((c: any) =>
          c.coin.toLowerCase().includes(f.coin.toLowerCase()),
        )
      )
        return false;
      if (
        f.sector !== "all" &&
        !a?.coins.some((c: any) => c.class === f.sector) &&
        !a?.rwa.openPositions.some((c: any) => c.class === f.sector)
      )
        return false;
      if (!matchesPreset(w, f.preset)) return false;
      return true;
    });
    const value = (w: any) =>
      f.sort === "rankChange"
        ? (w.daily?.rankChange ?? -Infinity)
        : f.sort === "quality"
          ? (w.analysis?.stats.score ?? -Infinity)
          : f.sort === "copy"
            ? (w.analysis?.copy.score ?? -Infinity)
            : f.sort === "winrate"
              ? (w.analysis?.stats.winRate ?? -Infinity)
              : (w[f.sort] ?? -Infinity);
    return filtered.sort((a: any, b: any) => value(b) - value(a));
  }, [r.data, f]);
  const picked = selected
      .map((a) => r.data?.data.find((w: any) => w.address === a))
      .filter(Boolean),
    presets = [
      ["all", "All wallets"],
      ["movers", "Rank risers"],
      ["entrants", "New entrants"],
      ["consistent", "Profitable 7D + 30D"],
      ["quality", "Quality ≥ 60"],
      ["rwa", "RWA traders"],
      ["copy", "Copy candidates"],
      ["lowrisk", "Exposure ≤ 3×"],
      ["specialist", "Coin specialists"],
    ];
  const downloadRows = () => {
    const vals = [
      [
        "Address",
        "Name",
        "30D PnL",
        "Equity",
        "Quality score",
        "Complete trades",
        "Win rate",
        "Profit factor",
        "Median holding minutes",
        "Main exposure multiple",
        "Copy score",
        "Analysis timestamp",
      ],
      ...rows.map((w: any) => [
        w.address,
        w.name || "",
        w.pnl30d,
        w.equity,
        w.analysis?.stats.score ?? "",
        w.analysis?.stats.completeTrades ?? "",
        w.analysis?.stats.winRate ?? "",
        w.analysis?.stats.profitFactor ?? "",
        w.analysis?.stats.medianHoldMs
          ? w.analysis.stats.medianHoldMs / 60000
          : "",
        w.analysis?.risk.exposureMultiple ?? "",
        w.analysis?.copy.score ?? "",
        w.analysis ? new Date(w.analysis.updatedAt).toISOString() : "",
      ]),
    ];
    download(
      "davira-screener.csv",
      vals
        .map((row) =>
          row
            .map(
              (v: any) =>
                `"${String(typeof v === "string" && /^[=+@-]/.test(v) ? "'" + v : (v ?? "")).replaceAll('"', '""')}"`,
            )
            .join(","),
        )
        .join("\n"),
      "text/csv",
    );
  };
  return (
    <Terminal view={activeView}>
      <div className="screener-heading">
        <div>
          <span className="eyebrow">WALLET INTELLIGENCE / SCREENER</span>
          <h1>
            {activeView === "rwa"
              ? "RWA wallet screener"
              : "Smart-money screener"}
          </h1>
          <p>Screen the record. Compare execution. Follow the right cohort.</p>
        </div>
        <div className="inline">
          <button className="button" onClick={() => setSaveOpen(!saveOpen)}>
            <Save size={14} />
            Save screen
          </button>
          <button
            className="button"
            disabled={!rows.length}
            onClick={downloadRows}
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>
      <WalletLookup />
      <DataState resource={r} />
      <Feedback action={action} />
      <div className="screener-strip">
        <span>
          <b>{num(rows.length)}</b> matching wallets
        </span>
        <span>
          <b>{r.data?.indexing.indexed ?? 0}</b> analyzed
        </span>
        <span>
          <b>{r.data?.indexing.queued ?? 0}</b> in research queue
        </span>
        <span className="muted">Reported PnL: {time(r.data?.updatedAt)}</span>
        <button className="text-link" onClick={() => r.reload()}>
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
      <section className="panel daily-discovery">
        <div>
          <span className="eyebrow">DAILY DISCOVERY / UTC</span>
          <h2>{r.data?.daily?.day || "Daily ranking"}</h2>
          <p>
            {r.data?.daily?.capturedAt
              ? `Frozen observation at ${time(r.data.daily.sourceAt)}`
              : "Awaiting the first fresh leaderboard observation today"}
          </p>
        </div>
        <div>
          <strong>{r.data?.daily?.rows?.length ?? "—"}</strong>
          <span>Ranked addresses</span>
        </div>
        <div>
          <strong>
            {r.data?.daily?.hasPrevious
              ? r.data.daily.rows.filter((w: any) => w.status === "entered")
                  .length
              : "—"}
          </strong>
          <span>Entered since yesterday</span>
        </div>
        <div>
          <strong>
            {r.data?.daily?.hasPrevious && r.data.daily.capturedAt
              ? r.data.daily.exited.length
              : "—"}
          </strong>
          <span>Left observed ranking</span>
        </div>
        <p className="daily-note">
          {r.data?.daily?.hasPrevious
            ? "Rank compares reported 30D PnL snapshots, not daily returns. Leaving the list does not mean a wallet stopped trading."
            : "Building a baseline. Changes appear after two consecutive UTC days of collection; missed days remain unavailable."}
        </p>
      </section>
      <div
        className="screen-presets category-presets"
        aria-label="Wallet research categories"
      >
        {presets.map(([id, label], index) => (
          <button
            key={id}
            className={f.preset === id ? "active" : ""}
            aria-pressed={f.preset === id}
            onClick={() => update("preset", id)}
          >
            <span className="category-index">
              0{index + 1}
              <b>
                {r.data
                  ? r.data.data
                      .filter((w: any) => matchesPreset(w, id))
                      .length.toLocaleString()
                  : "—"}
              </b>
            </span>
            <strong>{label}</strong>
            <small>{presetNotes[id]}</small>
          </button>
        ))}
      </div>
      {screens.data?.data.length > 0 && (
        <div className="saved-screens">
          <span>SAVED</span>
          {screens.data.data.map((s: any) => (
            <button
              key={s.id}
              onClick={() => {
                setF({ ...defaults, ...s.filters });
                setPage(0);
              }}
            >
              <Bookmark size={11} />
              {s.name}
            </button>
          ))}
        </div>
      )}
      {saveOpen && (
        <form
          className="save-screen"
          onSubmit={(e) => {
            e.preventDefault();
            action.run(async () => {
              await mutate("screens", { name, filters: f });
              await screens.reload();
              setSaveOpen(false);
              setName("");
            }, "Screen saved");
          }}
        >
          <label>
            Name this screen
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BTC swing traders"
            />
          </label>
          <button className="button primary" disabled={action.busy}>
            Save filters
          </button>
        </form>
      )}
      <section className="panel heavy-screener">
        <div className="toolbar screener-filters">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Search screened wallets"
              placeholder="Wallet name or address"
              value={f.q}
              onChange={(e) => update("q", e.target.value)}
            />
          </label>
          {/^0x[0-9a-fA-F]{40}$/.test(f.q.trim()) && (
            <Link
              className="button"
              href={`/wallet/${f.q.trim().toLowerCase()}`}
            >
              Open wallet <ArrowUpRight size={13} />
            </Link>
          )}
          <label>
            Coin
            <input
              placeholder="BTC, xyz:TSLA…"
              value={f.coin}
              onChange={(e) => update("coin", e.target.value)}
            />
          </label>
          <label>
            Asset class
            <select
              value={f.sector}
              onChange={(e) => update("sector", e.target.value)}
            >
              <option value="all">All asset classes</option>
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
          <button
            className={`button ${advanced ? "active" : ""}`}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        </div>
        {advanced && (
          <div className="advanced-filters">
            {[
              ["minEquity", "Min equity ($)"],
              ["maxEquity", "Max equity ($)"],
              ["minWinRate", "Min episode win rate (%)"],
              ["maxInactiveHours", "Last execution within (hours)"],
              ["minPnl", "Min 30D PnL ($)"],
              ["minScore", "Min quality /100"],
              ["minTrades", "Min complete trades"],
              ["maxLeverage", "Max exposure / equity"],
              ["minHold", "Min hold (minutes)"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  step="any"
                  value={(f as any)[key]}
                  onChange={(e) => update(key, e.target.value)}
                />
              </label>
            ))}
            <label className="check-label">
              <input
                type="checkbox"
                checked={f.evidenceOnly}
                onChange={(e) => update("evidenceOnly", e.target.checked)}
              />
              Sample checks passed
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={f.analyzed}
                onChange={(e) => update("analyzed", e.target.checked)}
              />
              Analyzed only
            </label>
            <button
              className="text-link"
              onClick={() => {
                setF(defaults);
                setPage(0);
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        <div className="screener-table-controls">
          <div className="view-switch">
            {[
              ["performance", "Trading performance"],
              ["rwa", "Asset specialization"],
              ["copy", "Copyability"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={f.view === key ? "active" : ""}
                onClick={() => update("view", key)}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            Sort
            <select
              value={f.sort}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="rankChange">Daily rank improvement</option>
              <option value="pnl30d">30D PnL</option>
              <option value="pnl7d">7D PnL</option>
              <option value="equity">Equity</option>
              <option value="quality">Quality score</option>
              <option value="copy">Copy score</option>
              <option value="winrate">Episode win rate</option>
            </select>
          </label>
        </div>
        <div className="table-scroll dense-table">
          <table>
            <thead>
              <tr>
                <th aria-label="Compare" />
                <th>Trader / wallet</th>
                <th title="Coin accounting for at least 60% of observed execution turnover; concentration does not establish profitability.">
                  Specialist coin
                </th>
                <th>Daily 30D-PnL rank</th>
                <th>Evidence</th>
                <th title="Historical pre-move methodology will be added after validation">
                  Pre-move research
                </th>
                <th>30D PnL ↕</th>
                <th>Main / reported equity · builder equity</th>
                {f.view === "performance" ? (
                  <>
                    <th>Quality /100</th>
                    <th>Closed trades</th>
                    <th>Win rate</th>
                    <th>Profit factor</th>
                    <th>Median hold</th>
                    <th>Exposure / equity</th>
                    <th>Sample depth</th>
                  </>
                ) : f.view === "rwa" ? (
                  <>
                    <th>RWA turnover share</th>
                    <th>RWA markets</th>
                    <th>Live RWA positions</th>
                    <th>Best coin score</th>
                  </>
                ) : (
                  <>
                    <th>Copy score /100</th>
                    <th>Median hold</th>
                    <th>Fills / day</th>
                    <th>Maker share</th>
                    <th>+10bps cost drag</th>
                    <th>Assessment</th>
                  </>
                )}
                <th>Research</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 30, page * 30 + 30).map((w: any) => {
                const a = w.analysis,
                  s = a?.stats;
                return (
                  <tr key={w.address}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Compare ${short(w.address)}`}
                        checked={selected.includes(w.address)}
                        disabled={
                          !selected.includes(w.address) && selected.length >= 3
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, w.address]
                              : selected.filter((x) => x !== w.address),
                          )
                        }
                      />
                    </td>
                    <td className="sticky-wallet">
                      <Link href={`/wallet/${w.address}`}>
                        <b>{w.name || short(w.address)}</b>
                        <small>
                          {short(w.address)}
                          {w.tracked ? " · followed" : ""}
                        </small>
                      </Link>
                    </td>
                    <td>
                      {a?.coins[0]?.volumeShare >= 60 ? (
                        <>
                          <Link
                            className="text-link"
                            href={`/coins?coin=${encodeURIComponent(a.coins[0].coin)}`}
                          >
                            <b>{a.coins[0].coin}</b>
                          </Link>
                          <small className="cell-sub">
                            {a.coins[0].volumeShare.toFixed(1)}% of turnover
                          </small>
                        </>
                      ) : (
                        <span className="muted">
                          {a?.coins?.length
                            ? "Mixed allocation"
                            : "Not analyzed"}
                        </span>
                      )}
                    </td>
                    <td>
                      {w.daily ? (
                        <>
                          <b>#{w.daily.rank}</b>
                          <small className="cell-sub">
                            {w.daily.status === "baseline"
                              ? "Baseline"
                              : w.daily.status === "entered"
                                ? "New entrant"
                                : w.daily.rankChange > 0
                                  ? `↑ ${w.daily.rankChange}`
                                  : w.daily.rankChange < 0
                                    ? `↓ ${Math.abs(w.daily.rankChange)}`
                                    : "Unchanged"}
                          </small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td title={w.evidence?.issues?.join(" · ")}>
                      <span className="sample-tag">
                        {w.evidence?.status || "Not indexed"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="muted"
                        title="Reserved for historical positioning before market moves. No score or classification is available yet."
                      >
                        Methodology pending
                      </span>
                    </td>
                    <td
                      title={w.pnl30dSource}
                      className={w.pnl30d >= 0 ? "positive" : "negative"}
                    >
                      {w.pnl30d === null ? "—" : money(w.pnl30d, 1)}
                    </td>
                    <td>
                      {w.equity === null ? "—" : money(w.equity, 1)}
                      <small className="cell-sub">
                        {a?.builderCoverage
                          ?.filter((v: any) => v.available)
                          .map(
                            (v: any) =>
                              `${v.dex}: ${v.equity == null ? "unavailable" : money(v.equity)}${v.stale ? " (stale)" : ""}`,
                          )
                          .join(" · ") || "Builder balances not verified"}
                      </small>
                    </td>
                    {f.view === "performance" ? (
                      <>
                        <td>
                          <Score value={s?.score} />
                        </td>
                        <td>{s?.completeTrades ?? "—"}</td>
                        <td>
                          {s?.winRate == null
                            ? "—"
                            : `${s.winRate.toFixed(1)}%`}
                        </td>
                        <td>
                          {s?.profitFactor == null
                            ? s?.noLosses
                              ? "No losses"
                              : "—"
                            : s.profitFactor.toFixed(2)}
                        </td>
                        <td>{duration(s?.medianHoldMs ?? null)}</td>
                        <td>
                          {a?.risk.exposureMultiple == null
                            ? "—"
                            : `${a.risk.exposureMultiple.toFixed(2)}×`}
                        </td>
                        <td>
                          <span
                            className={`sample-tag ${s?.confidence === "Substantial sample" ? "strong" : ""}`}
                          >
                            {s?.confidence || "Not indexed"}
                          </span>
                        </td>
                      </>
                    ) : f.view === "rwa" ? (
                      <>
                        <td>{a ? `${a.rwa.share.toFixed(1)}%` : "—"}</td>
                        <td>
                          <div className="coin-tags">
                            {a?.rwa.coins.slice(0, 3).map((c: string) => (
                              <Link
                                href={`/flows?coin=${encodeURIComponent(c)}`}
                                key={c}
                              >
                                {c}
                              </Link>
                            ))}
                            {a && !a.rwa.coins.length && "None observed"}
                          </div>
                        </td>
                        <td>{a?.rwa.openPositions.length ?? "—"}</td>
                        <td>
                          <Score
                            value={
                              a?.coins
                                .filter((c: any) => c.score !== null)
                                .sort((x: any, y: any) => y.score - x.score)[0]
                                ?.score
                            }
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <Score value={a?.copy.score} label="Copyability" />
                        </td>
                        <td>{duration(s?.medianHoldMs ?? null)}</td>
                        <td>{s ? s.fillFrequency.toFixed(1) : "—"}</td>
                        <td>{s ? `${s.makerShare.toFixed(1)}%` : "—"}</td>
                        <td className={a?.copy.costDrag > 50 ? "negative" : ""}>
                          {a?.copy.costDrag == null
                            ? "—"
                            : `${a.copy.costDrag.toFixed(1)}%`}
                        </td>
                        <td>{a?.copy.grade || "Not analyzed"}</td>
                      </>
                    )}
                    <td>
                      {a ? (
                        <Link
                          href={`/wallet/${w.address}`}
                          className="text-link"
                        >
                          Inspect <ArrowUpRight size={12} />
                        </Link>
                      ) : (
                        <button
                          disabled={action.busy}
                          className="text-link"
                          onClick={() =>
                            action.run(
                              () => mutate("analyze", { address: w.address }),
                              "Wallet moved to the front of the research queue",
                            )
                          }
                        >
                          Analyze +
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && !r.loading && (
          <Empty title="No wallets match this screen">
            Adjust the filters or allow more wallets to be analyzed. Scores
            require enough complete position episodes.
          </Empty>
        )}
        <div className="panel-foot">
          <span>
            Showing {rows.length ? Math.min(page * 30 + 1, rows.length) : 0}–
            {Math.min((page + 1) * 30, rows.length)} of {rows.length}
          </span>
          <div className="inline">
            <button
              className="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>{page + 1}</span>
            <button
              className="button"
              disabled={(page + 1) * 30 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {selected.length > 0 && (
        <div className="compare-bar">
          <span>{selected.length} / 3 wallets selected</span>
          <div className="coin-tags">
            {picked.map((w: any) => (
              <span key={w.address}>
                {w.name || short(w.address)}
                <button
                  aria-label={`Unselect ${short(w.address)}`}
                  onClick={() =>
                    setSelected(selected.filter((a) => a !== w.address))
                  }
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <button
            className="button primary"
            disabled={selected.length < 2}
            onClick={() => setCompare(!compare)}
          >
            <GitCompareArrows size={14} />
            {compare ? "Hide comparison" : "Compare wallets"}
          </button>
        </div>
      )}
      {compare && picked.length >= 2 && (
        <section className="panel comparison">
          <div className="panel-head">
            <h2>Side-by-side wallet research</h2>
            <button
              className="icon-button"
              aria-label="Close comparison"
              onClick={() => setCompare(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Evidence</th>
                  {picked.map((w: any) => (
                    <th key={w.address}>
                      <Link href={`/wallet/${w.address}`}>
                        {w.name || short(w.address)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "30D reported PnL",
                    (w: any) => (w.pnl30d == null ? "—" : money(w.pnl30d)),
                  ],
                  [
                    "Quality score",
                    (w: any) =>
                      w.analysis?.stats.score ?? "Insufficient history",
                  ],
                  [
                    "Copyability",
                    (w: any) => w.analysis?.copy.grade || "Not analyzed",
                  ],
                  [
                    "Median hold",
                    (w: any) =>
                      duration(w.analysis?.stats.medianHoldMs ?? null),
                  ],
                  [
                    "Complete episodes",
                    (w: any) => w.analysis?.stats.completeTrades ?? "—",
                  ],
                  [
                    "Closed-PnL drawdown",
                    (w: any) =>
                      w.analysis ? money(w.analysis.stats.maxDrawdownUsd) : "—",
                  ],
                  [
                    "Largest market",
                    (w: any) => w.analysis?.coins[0]?.coin || "—",
                  ],
                  [
                    "Main exposure / equity",
                    (w: any) =>
                      w.analysis?.risk.exposureMultiple?.toFixed(2) || "—",
                  ],
                ].map(([label, fn]: any) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {picked.map((w: any) => (
                      <td key={w.address}>{fn(w)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <details className="methodology">
        <summary>Score methodology, sample limits & interpretation</summary>
        <p>{r.data?.methodology}</p>
        <p>
          Win rate refers to complete reconstructed position episodes, not
          fills. The drawdown is in dollars on closed episode PnL, not an
          account-equity drawdown. Quality and copyability are separate scores.
          “RWA” here means classified equity, index, commodity or FX derivative
          exposure; RWA-related crypto tokens have their own category.
        </p>
      </details>
    </Terminal>
  );
}
