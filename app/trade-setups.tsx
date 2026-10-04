"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Crosshair,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import Terminal, { Heading, useData, money } from "./terminal";
import { DataState, download, time } from "./ui";
import { sizeTrade } from "../lib/trade-risk.mjs";
import { instrumentClass } from "../lib/instrument-class.mjs";
import TokenDesk from "./token-desk";

const defaults = {
  equity: "10000",
  riskPct: "0.5",
  dailyLimitPct: "2",
  dailyLoss: "0",
  totalRiskPct: "3",
  openRisk: "0",
  allocationPct: "25",
  feeBps: "5",
  slippageBps: "10",
};
// Significant digits preserve meaningful levels on very small-priced markets.
const price = (n: number) =>
  Number.isFinite(n) && n > 0
    ? `$${n.toLocaleString("en-US", { maximumSignificantDigits: 8 })}`
    : "—";
const fields: {
  key: keyof typeof defaults;
  label: string;
  suffix: string;
  max?: number;
}[] = [
  { key: "equity", label: "Account equity", suffix: "USD" },
  { key: "riskPct", label: "Risk per trade", suffix: "%", max: 5 },
  {
    key: "allocationPct",
    label: "Max. position allocation",
    suffix: "%",
    max: 100,
  },
  { key: "dailyLimitPct", label: "Daily loss limit", suffix: "%", max: 20 },
  { key: "dailyLoss", label: "Realized loss today", suffix: "USD" },
  { key: "totalRiskPct", label: "Total open-risk limit", suffix: "%", max: 20 },
  { key: "openRisk", label: "Risk in existing positions", suffix: "USD" },
  { key: "feeBps", label: "Fee estimate per side", suffix: "bps", max: 100 },
  {
    key: "slippageBps",
    label: "Slippage estimate per side",
    suffix: "bps",
    max: 500,
  },
];
const tone = (action: string) =>
  action === "Long bias"
    ? "positive"
    : action === "Short bias"
      ? "negative"
      : "muted";
const assetGroups = ["All", "Crypto", "Equities", "Commodities", "Other"];
const assetGroup = (coin: string) => {
  const type = instrumentClass(coin);
  if (["Crypto", "RWA token"].includes(type)) return "Crypto";
  if (["Equity", "Index"].includes(type)) return "Equities";
  if (type === "Commodity") return "Commodities";
  return "Other";
};

export default function TradeSetups() {
  const params = useSearchParams();
  const [coin, setCoin] = useState(params.get("coin") || "BTC");
  const [window, setWindow] = useState("24h");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [assetFilter, setAssetFilter] = useState("All");
  const [risk, setRisk] = useState(defaults);
  const [edited, setEdited] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setCoin(params.get("coin") || "BTC");
  }, [params]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);
  const flows = useData(`flows?window=${window}&cohort=all`, 30000);
  const markets = useData("markets", 60000);
  const builderMarkets = useData("global-markets", 60000);
  const setup = useData(
    `trade-setup?coin=${encodeURIComponent(coin)}&window=${window}`,
    60000,
  );
  const d = setup.data;
  const sameSelection = d?.coin === coin && d?.window === window;
  const expired = sameSelection && now >= d.expiresAt;
  const active =
    sameSelection &&
    !setup.error &&
    !setup.loading &&
    !expired &&
    d.status === "candidate";
  const levels = active ? d.levels : null;
  const values = Object.fromEntries(
    Object.entries(risk).map(([k, v]) => [
      k,
      v.trim() === "" ? NaN : Number(v),
    ]),
  );
  const sizing: any = sizeTrade(levels, d?.side, values);
  const rows = useMemo(() => {
    const byCoin = new Map(
      (flows.data?.data || []).map((r: any) => [r.coin, r]),
    );
    const universe = new Map<string, any>();
    for (const m of [
      ...(markets.data?.data || []),
      ...(builderMarkets.data?.data?.markets || []),
    ])
      universe.set(m.coin, m);
    return Array.from(universe.values())
      .map((m: any) => ({ ...m, evidence: byCoin.get(m.coin) as any }))
      .sort((a: any, b: any) => {
        const rank = (m: any) =>
          ["Long bias", "Short bias"].includes(m.evidence?.marketRead?.action)
            ? 1
            : 0;
        return rank(b) - rank(a) || b.volume - a.volume;
      });
  }, [flows.data, markets.data, builderMarkets.data]);
  const assetCounts = Object.fromEntries(
    assetGroups.map((group) => [
      group,
      group === "All"
        ? rows.length
        : rows.filter((m: any) => assetGroup(m.coin) === group).length,
    ]),
  );
  const visible = rows.filter(
    (m: any) =>
      `${m.coin} ${m.dex || "Hyperliquid"} ${instrumentClass(m.coin)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (assetFilter === "All" || assetGroup(m.coin) === assetFilter) &&
      (filter === "All" ||
        (filter === "Directional"
          ? ["Long bias", "Short bias"].includes(m.evidence?.marketRead?.action)
          : !["Long bias", "Short bias"].includes(
              m.evidence?.marketRead?.action,
            ))),
  );
  const directional = rows.filter((m: any) =>
    ["Long bias", "Short bias"].includes(m.evidence?.marketRead?.action),
  ).length;
  const currentMarket = rows.find((m: any) => m.coin === coin);
  const coverage = builderMarkets.data?.data?.coverage || [];
  const loadedVenues = coverage.filter((v: any) => v.ok).length;
  const mainCount = rows.filter((m: any) => !m.dex).length;
  const builderCount = rows.length - mainCount;
  const reasons = !sameSelection
    ? []
    : [
        ...d.reasons,
        ...(expired
          ? [
              "This snapshot has expired. Refresh before using any price levels.",
            ]
          : []),
      ];
  const state = setup.loading
    ? "Checking evidence"
    : setup.error
      ? "Data unavailable"
      : active
        ? d.side === "long"
          ? "Buy / long candidate"
          : "Sell / short candidate"
        : "Wait — no new position";

  return (
    <Terminal view="setups">
      <Heading
        eyebrow="FROM OBSERVATION TO A TRADE PLAN"
        title="Their activity. Your risk."
        text="Turn qualified wallet positioning into a price-based scenario, sized for your account."
      >
        <div className="time-switch" aria-label="Wallet evidence window">
          <select
            aria-label="Trade research coin"
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
          >
            {!currentMarket && <option value={coin}>{coin}</option>}
            {rows.map((m: any) => (
              <option key={m.coin} value={m.coin}>
                {m.coin} · {instrumentClass(m.coin)} · {m.dex || "Main DEX"}
              </option>
            ))}
          </select>
          {["6h", "24h"].map((w) => (
            <button
              key={w}
              aria-pressed={window === w}
              className={window === w ? "active" : ""}
              onClick={() => setWindow(w)}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </Heading>
      <div className="setup-process">
        <span>
          <b>01</b> Read wallet evidence
        </span>
        <span>
          <b>02</b> Check price & invalidation
        </span>
        <span>
          <b>03</b> Set your own risk
        </span>
        <span className="setup-research-label">RESEARCH / WALLET + PRICE</span>
      </div>
      <div className="setup-overview">
        <div>
          <b>{rows.length || "—"}</b>
          <span>Covered perpetual markets</span>
        </div>
        <div>
          <b>{flows.loading ? "—" : directional}</b>
          <span>Directional wallet biases</span>
        </div>
        <div>
          <b>1H</b>
          <span>Price structure</span>
        </div>
        <p>
          Bias is not an entry signal. Each candidate must also pass price
          freshness, trend, volatility and risk checks.
        </p>
      </div>
      <p className="subtle-note setup-coverage" role="status">
        {mainCount} main DEX markets · {builderCount} builder markets
        {coverage.length > 0 &&
          ` · ${loadedVenues} / ${coverage.length} covered builder venues available`}
        . Same evidence and risk checks for every market.
        {coverage.some((v: any) => !v.ok) && (
          <span>
            {" "}
            Unavailable:{" "}
            {coverage
              .filter((v: any) => !v.ok)
              .map((v: any) => v.dex)
              .join(", ")}
            .
          </span>
        )}
      </p>
      <details className="panel research-card" open>
        <summary>
          {coin} wallet evidence · flows, price and the traders behind them
        </summary>
        <TokenDesk key={coin} coin={coin} />
      </details>
      <div className="setup-workspace">
        <aside className="panel setup-board">
          <div className="panel-head">
            <div>
              <span className="eyebrow">01 / OBSERVE</span>
              <h2>Choose a market</h2>
            </div>
            <Crosshair size={19} />
          </div>
          <div className="setup-search">
            <Search size={15} />
            <input
              aria-label="Search setup markets"
              placeholder="Find BTC, xyz:TSLA, GOLD…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="setup-asset-filters" aria-label="Setup asset class">
            {assetGroups.map((group) => (
              <button
                key={group}
                aria-pressed={assetFilter === group}
                className={assetFilter === group ? "active" : ""}
                onClick={() => setAssetFilter(group)}
              >
                {group} <small>{assetCounts[group]}</small>
              </button>
            ))}
          </div>
          <div className="setup-filters">
            {["All", "Directional", "Wait / neutral"].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <DataState resource={flows} />
          <DataState resource={markets} />
          <DataState resource={builderMarkets} />
          <p className="setup-market-count" aria-live="polite">
            Showing {visible.length} / {rows.length} markets
          </p>
          <div
            className="setup-market-list"
            role="group"
            aria-label="Market selection"
          >
            {visible.map((m: any) => (
              <button
                key={m.coin}
                className={coin === m.coin ? "active" : ""}
                aria-pressed={coin === m.coin}
                onClick={() => setCoin(m.coin)}
              >
                <span>
                  <strong>{m.coin}</strong>
                  <small>{price(m.price)}</small>
                  <small>
                    {instrumentClass(m.coin)} · {m.dex || "Main DEX"}
                  </small>
                </span>
                <span>
                  <b className={tone(m.evidence?.marketRead?.action)}>
                    {m.evidence?.marketRead?.action || "Wait"}
                  </b>
                  <small>
                    {m.evidence?.wallets || 0} wallets ·{" "}
                    {m.evidence?.marketRead?.qualified || 0} specialists
                  </small>
                </span>
              </button>
            ))}
            {!visible.length && !markets.loading && !builderMarkets.loading && (
              <p className="subtle-note">No markets match this filter.</p>
            )}
          </div>
          <p className="subtle-note">
            All indexed wallets · {window}. Current token track records qualify
            specialist votes. Main and covered builder DEX perpetuals are
            evaluated using the same model. Equities includes index derivatives;
            Other includes FX and unclassified builder instruments. A listed
            market does not automatically qualify for a trade plan.
          </p>
        </aside>
        <div className="setup-detail">
          <section className="panel setup-plan" aria-labelledby="setup-title">
            <div className="panel-head">
              <div>
                <span className="eyebrow">02 / PLAN · {coin}</span>
                <h2 id="setup-title">{state}</h2>
              </div>
              <button
                className="button"
                onClick={() => {
                  void setup.reload();
                  void flows.reload();
                  void markets.reload();
                  void builderMarkets.reload();
                }}
                disabled={setup.loading}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
            <DataState resource={setup} />
            <div className="setup-evidence">
              <div>
                <span>Wallet direction</span>
                <b>
                  {sameSelection ? (d.read?.score ?? "—") : "—"}
                  <small> / 100</small>
                </b>
              </div>
              <div>
                <span>Evidence quality</span>
                <b>
                  {sameSelection ? (d.read?.confidence ?? "—") : "—"}
                  <small> / 100</small>
                </b>
              </div>
              <div>
                <span>Qualified specialists</span>
                <b>
                  {sameSelection ? (d.read?.qualified ?? 0) : "—"}
                  <small>
                    {" "}
                    / {sameSelection ? (d.read?.count ?? 0) : "—"} wallets
                  </small>
                </b>
              </div>
            </div>
            <p className="setup-explanation">
              {sameSelection
                ? d.read?.explanation ||
                  "There is not enough indexed wallet history to establish a direction."
                : "Checking the selected market’s wallet evidence and completed candles."}
            </p>
            {!active && !setup.loading && (
              <div className="setup-blockers">
                <ShieldCheck size={20} />
                <div>
                  <h3>What needs to change</h3>
                  <ul>
                    {(reasons.length
                      ? reasons
                      : [
                          setup.error
                            ? "Restore the market data connection."
                            : "Wait for aligned wallet and price evidence.",
                        ]
                    ).map((reason: string) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="setup-levels">
              <div>
                <span>Entry reference</span>
                <strong>{levels ? price(levels.entry) : "—"}</strong>
                <small>Current mark · not an order fill</small>
              </div>
              <div className="setup-stop">
                <span>Stop-loss reference</span>
                <strong>{levels ? price(levels.stop) : "—"}</strong>
                <small>
                  {levels
                    ? `${levels.stopPct.toFixed(2)}% from entry · structure + volatility`
                    : "Withheld until evidence passes"}
                </small>
              </div>
              {[1, 2, 3].map((r) => (
                <div key={r}>
                  <span>
                    TP{r} · {r}R gross
                  </span>
                  <strong>
                    {levels
                      ? price(levels.targets.find((t: any) => t.r === r)?.price)
                      : "—"}
                  </strong>
                  <small>{r}× stop distance · scenario level</small>
                </div>
              ))}
            </div>
            {levels && (
              <div className="setup-invalidation">
                <b>Reassess the setup if</b>
                <p>
                  Price crosses {price(levels.stop)}, wallet direction changes,
                  evidence fails, or this snapshot expires. ATR14:{" "}
                  {price(levels.atr)} · 20-hour mean: {price(levels.trend)}.
                </p>
              </div>
            )}
            <div className="panel-foot">
              <span>
                Quote {sameSelection ? time(d.quoteAt) : "—"}
                <br />
                {active
                  ? `Valid until ${time(d.expiresAt)}`
                  : "No actionable levels shown"}
              </span>
              <Link
                className="text-link"
                href={`/flows?coin=${encodeURIComponent(coin)}`}
              >
                Inspect source wallets <ArrowUpRight size={13} />
              </Link>
            </div>
          </section>
          <section className="panel setup-risk" aria-labelledby="risk-title">
            <div className="panel-head">
              <div>
                <span className="eyebrow">03 / SIZE</span>
                <h2 id="risk-title">Your risk budget</h2>
                <p>
                  {edited
                    ? "Your inputs · calculated locally in this browser"
                    : "Illustrative inputs — replace with your account and limits"}
                </p>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="setup-risk-fields">
              {fields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  <span>
                    <input
                      type="number"
                      aria-label={f.label}
                      min="0"
                      max={f.max}
                      step="any"
                      value={risk[f.key]}
                      onChange={(e) => {
                        setRisk({ ...risk, [f.key]: e.target.value });
                        setEdited(true);
                      }}
                    />
                    <small>{f.suffix}</small>
                  </span>
                </label>
              ))}
            </div>
            <p className="subtle-note">
              1 bp = 0.01%. Loss and open-risk amounts are entered by you.
              Allocation is capped at 1× account exposure; another wallet’s
              leverage never sets your size. Funding and liquidation modelling
              are outside this estimate.
            </p>
            {active && sizing.errors.length > 0 && (
              <div className="notice error" role="status">
                {sizing.errors.join(" ")}
              </div>
            )}
            <div className="setup-sizing" aria-live="polite">
              <div>
                <span>Position notional</span>
                <strong>
                  {active && !sizing.errors.length
                    ? money(sizing.notional, 2)
                    : "—"}
                </strong>
                <small>
                  {active && !sizing.errors.length
                    ? `${sizing.quantity.toLocaleString("en-US", { maximumSignificantDigits: 8 })} ${coin}`
                    : "Requires a valid setup and risk inputs"}
                </small>
              </div>
              <div>
                <span>Modeled loss at stop</span>
                <strong className="negative">
                  {active && !sizing.errors.length
                    ? money(sizing.risk, 2)
                    : "—"}
                </strong>
                <small>
                  {active && !sizing.errors.length
                    ? `${sizing.riskPct.toFixed(2)}% equity · includes estimated costs`
                    : "Stop execution can slip beyond this amount"}
                </small>
              </div>
            </div>
            {active && !sizing.errors.length && (
              <>
                <div className="setup-budget">
                  <span>
                    Available risk budget <b>{money(sizing.budget, 2)}</b>
                  </span>
                  <span>
                    Daily capacity <b>{money(sizing.dailyRemaining, 2)}</b>
                  </span>
                  <span>
                    Open-risk capacity <b>{money(sizing.openRemaining, 2)}</b>
                  </span>
                </div>
                {sizing.allocationLimited && (
                  <p className="subtle-note">
                    Your allocation cap reduces this position below your maximum
                    trade-risk budget.
                  </p>
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Full exit scenario</th>
                        <th>After estimated costs</th>
                        <th>Net reward / risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizing.targets.map((t: any) => (
                        <tr key={t.r}>
                          <td>
                            TP{t.r} · {price(t.price)}
                          </td>
                          <td
                            className={t.netPnl >= 0 ? "positive" : "negative"}
                          >
                            {money(t.netPnl, 2)}
                          </td>
                          <td>{t.netR.toFixed(2)}R</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="panel-foot">
                  <span>
                    Each row assumes a separate full exit. Targets are not
                    cumulative profits.
                  </span>
                  <button
                    className="button"
                    onClick={() =>
                      download(
                        `davira-${coin}-research-plan.json`,
                        JSON.stringify(
                          {
                            kind: "research-only",
                            setup: d,
                            riskInputs: values,
                            sizing,
                            exportedAt: new Date().toISOString(),
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    <Download size={14} />
                    Export plan
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <details className="panel research-card setup-method">
        <summary>How this model works · assumptions & limitations</summary>
        <div className="setup-method-grid">
          <div>
            <h3>Wallet direction</h3>
            <p>
              45% new long-versus-short opening balance, 35% token-specialist
              vote, 20% buy-versus-sell execution balance. A score ≥65 is long
              bias; ≤35 is short bias. At least five wallets, three profitable
              token specialists, 70% fresh analyses and no dominant wallet above
              60% are required. Scores are not probabilities.
            </p>
          </div>
          <div>
            <h3>Entry and stop</h3>
            <p>
              The current mark is an entry reference. The last completed hour
              must agree with the 20-hour mean. The stop sits beyond the 12-hour
              low/high plus a 0.25 ATR buffer, and at least 1.5 ATR or 0.2%
              away. Stops wider than 8%, missing hourly bars, and stale prices
              block a setup.
            </p>
          </div>
          <div>
            <h3>Independent position size</h3>
            <p>
              Available risk is the smallest of per-trade, remaining daily and
              remaining open-risk budgets. Quantity = available risk ÷ (stop
              distance + estimated entry/exit costs), further capped by
              allocation. Costs use entry and exit notionals. This does not
              guarantee a maximum realized loss.
            </p>
          </div>
          <div>
            <h3>What targets mean</h3>
            <p>
              1R, 2R and 3R are multiples of the stop distance. They are
              planning scenarios, not predictions or observed wallet targets.
              Estimates omit funding and changing liquidity. No predictive
              performance or backtested profitability has been established for
              this v1.
            </p>
          </div>
        </div>
        <p>
          Method references:{" "}
          <a
            href="https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint"
            target="_blank"
            rel="noreferrer"
          >
            Hyperliquid market data
          </a>{" "}
          ·{" "}
          <a
            href="https://www.cmegroup.com/education/courses/trade-and-risk-management/proper-position-size"
            target="_blank"
            rel="noreferrer"
          >
            CME position sizing
          </a>
          . This page prepares research plans; it does not place or manage
          orders.
        </p>
      </details>
    </Terminal>
  );
}
