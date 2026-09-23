"use client";
import BrandMark from "./brand-mark";
import ThemeToggle from "./theme-toggle";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef, useId } from "react";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  Bell,
  Bookmark,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  Radio,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Wallet,
  ArrowLeftRight,
  Layers3,
  Copy,
  X,
  Menu,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const nav = [
  ["summary", "Market summary", Globe2, "/summary"],
  ["discover", "Wallet screener", Wallet, "/discover"],
  ["overview", "Cohort positions", LayoutDashboard, "/dashboard"],
  ["flows", "Coin inflow / outflow", ArrowLeftRight, "/flows"],
  ["rwa", "RWA wallets", Layers3, "/rwa"],
  ["copy", "Copy research", Copy, "/copy"],
  ["coins", "Markets", BarChart3, "/coins"],
  ["radar", "Position radar", Radio, "/radar"],
  ["watchlist", "Watchlist", Bookmark, "/watchlist"],
  ["calendar", "Events & news", CalendarDays, "/calendar"],
  ["reports", "Research", FileText, "/reports"],
  ["paper", "Paper trading", Activity, "/paper"],
  ["settings", "Data & settings", Settings2, "/settings"],
] as const;
export const money = (n: number, d = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
    notation: Math.abs(n) >= 1e6 ? "compact" : "standard",
  }).format(n || 0);
export const num = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n || 0);
export const price = (n: number) => money(n, n < 1 ? 5 : n < 100 ? 3 : 1);
export const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export const pct = (n: number) => `${n > 0 ? "+" : ""}${(n || 0).toFixed(2)}%`;
export function useData(path: string | null, delay = 30000) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    controller = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    controller.current?.abort();
    if (!path) {
      setLoading(false);
      return;
    }
    const request = new AbortController();
    controller.current = request;
    try {
      const r = await fetch(`/api/engine/${path}`, { signal: request.signal });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Data unavailable");
      if (!request.signal.aborted) {
        setData(d);
        setError("");
      }
    } catch (e: any) {
      if (!request.signal.aborted) setError(e.message);
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    setError("");
    setLoading(true);
    void reload();
    const id = setInterval(() => {
      if (!document.hidden) void reload();
    }, delay);
    return () => {
      clearInterval(id);
      controller.current?.abort();
    };
  }, [reload, delay]);
  return { data, error, loading, reload };
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Database size={26} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Chart({
  data,
  height = 250,
}: {
  data: any[];
  height?: number;
}) {
  const gradientId = useId();
  return (
    <div style={{ width: "100%", height, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
              })
            }
            minTickGap={65}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--text)",
            }}
            labelFormatter={(v) => new Date(v).toLocaleString()}
            formatter={(v: any) => [price(Number(v)), "Value"]}
          />
          <Area
            type="monotone"
            dataKey="c"
            stroke="var(--accent)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export default function Terminal({
  view,
  children,
}: {
  view: string;
  children?: React.ReactNode;
}) {
  const overview = useData("overview"),
    [menu, setMenu] = useState(false);
  const data = overview.data,
    markets = data?.markets || [];
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);
  return (
    <div className="terminal">
      <aside
        id="workspace-navigation"
        className={`sidebar ${menu ? "open" : ""}`}
      >
        <Link className="brand" href="/">
          <span className="brand-symbol">
            <BrandMark />
          </span>
          daVIRA<span className="version">/ 01</span>
        </Link>
        <div className="workspace">
          <span className="workspace-avatar">
            <BrandMark />
          </span>
          <div>
            Personal workspace<small>Local edition</small>
          </div>
          <span className="workspace-edition">01</span>
        </div>
        <div className="nav-label">INTELLIGENCE</div>
        <nav aria-label="Research workspace">
          {nav.map(([key, label, Icon, href], i) => (
            <Link
              onClick={() => setMenu(false)}
              href={href}
              key={key}
              aria-current={key === view ? "page" : undefined}
              className={`${key === view ? "active" : ""} ${i === 7 ? "nav-separated" : ""}`}
            >
              <Icon size={18} />
              {label}
              {key === "radar" && <span className="tiny-tag">BETA</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <ShieldCheck size={16} /> Your data stays local
          </div>
          <p>
            Public market data.
            <br />
            No exchange keys required.
          </p>
          <a
            href="https://hyperliquid.gitbook.io/hyperliquid-docs"
            target="_blank"
            rel="noreferrer"
          >
            <CircleHelp size={16} /> Source documentation{" "}
            <ExternalLink size={12} />
          </a>
        </div>
      </aside>
      {menu && (
        <button
          className="navigation-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-toggle icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="workspace-navigation"
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>
              {nav.find((n) => n[0] === view)?.[1] || "Wallet profile"}
            </strong>
          </div>
          <div className="top-actions">
            <ThemeToggle />
            <span className="status">
              <i className={data && !data.stale ? "live" : ""} />
              {data
                ? data.stale
                  ? "Cached data"
                  : "Data connected"
                : "Connecting"}
            </span>
            <button
              className="icon-button"
              onClick={() => overview.reload()}
              aria-label="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
            <Link
              href="/radar"
              className="icon-button"
              aria-label="Open alerts"
            >
              <Bell size={18} />
            </Link>
            <span className="avatar">V</span>
          </div>
        </header>
        <div className="ticker">
          {markets.slice(0, 7).map((m: any) => (
            <Link
              href={`/coins?coin=${encodeURIComponent(m.coin)}`}
              key={m.coin}
            >
              <b>{m.coin}</b>
              <span>{price(m.price)}</span>
              <em className={m.change >= 0 ? "positive" : "negative"}>
                {pct(m.change)}
              </em>
            </Link>
          ))}
        </div>
        <div className="page">
          {overview.error && (
            <div className="notice error">
              {overview.error}
              <button onClick={() => overview.reload()}>Retry</button>
            </div>
          )}
          {children || <Overview data={data} markets={markets} />}
          <footer className="page-footer">
            <span>daVIRA / Independent market research</span>
            <span>Source-linked data. Transparent coverage.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
function Overview({ data, markets }: { data: any; markets: any[] }) {
  const chart = useData("candles?coin=BTC", 60000);
  const btc = markets.find((m) => m.coin === "BTC");
  const advancing = markets.filter((m) => m.change > 0).length;
  return (
    <>
      <Heading
        eyebrow="HYPERLIQUID INTELLIGENCE"
        title="Market overview"
        text="Follow the positioning. Understand the market."
      >
        <Link className="button primary" href="/discover">
          Discover wallets <ArrowUpRight size={16} />
        </Link>
      </Heading>
      <div className="stats">
        <Stat
          label="24h perpetual volume"
          value={money(markets.reduce((a, m) => a + m.volume, 0))}
          detail="Across listed main DEX markets"
        />
        <Stat
          label="Open interest"
          value={money(markets.reduce((a, m) => a + m.openInterest, 0))}
          detail="Outstanding notional exposure"
        />
        <Stat
          label="Markets advancing"
          value={`${advancing} / ${markets.length}`}
          detail="Price change over 24 hours"
        />
        <Stat
          label="Followed wallets"
          value={String(data?.watchlist?.length || 0)}
          detail="Your personal observation list"
        />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">MARKET BENCHMARK</span>
              <h2>
                Bitcoin <span className="muted small">BTC / USD</span>
              </h2>
            </div>
            <span className="pill">7D · 1H</span>
          </div>
          <div className="chart-summary">
            <strong>{btc ? price(btc.price) : "—"}</strong>
            <span className={btc?.change >= 0 ? "positive" : "negative"}>
              {btc ? pct(btc.change) : ""} <small>24h</small>
            </span>
          </div>
          {chart.data ? (
            <Chart data={chart.data.data} />
          ) : (
            <Empty
              title={
                chart.error ? "Chart unavailable" : "Loading price history"
              }
            >
              {chart.error || "Fetching hourly candles from Hyperliquid."}
            </Empty>
          )}
          <div className="panel-foot">
            <span>Hyperliquid mark price</span>
            <span>
              {data
                ? `Updated ${new Date(data.updatedAt).toLocaleTimeString()}`
                : "Connecting to source"}
            </span>
          </div>
        </section>
        <section className="panel pulse">
          <div className="panel-head">
            <h2>Market pulse</h2>
            <Globe2 size={18} />
          </div>
          <div className="pulse-label">24H BREADTH</div>
          <div className="breadth-value">
            {markets.length
              ? Math.round((advancing / markets.length) * 100)
              : 0}
            <span>%</span>
            <small>of markets advancing</small>
          </div>
          <div className="breadth-track">
            <span
              style={{
                width: `${markets.length ? (advancing / markets.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="split">
            <span className="positive">{advancing} advancing</span>
            <span className="negative">
              {markets.length - advancing} declining
            </span>
          </div>
          <div className="pulse-list">
            {[...markets]
              .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
              .slice(0, 3)
              .map((m) => (
                <Link href={`/coins?coin=${m.coin}`} key={m.coin}>
                  <span className="coin-icon">{m.coin[0]}</span>
                  <div>
                    <b>{m.coin}</b>
                    <small>{m.category}</small>
                  </div>
                  <strong className={m.change >= 0 ? "positive" : "negative"}>
                    {pct(m.change)}
                  </strong>
                </Link>
              ))}
          </div>
          <div className="subtle-note">
            Price breadth describes participation. It is not a directional
            forecast.
          </div>
        </section>
      </div>
      <section className="panel market-panel">
        <div className="panel-head">
          <div>
            <h2>Most active markets</h2>
            <p>Ranked by 24-hour traded notional</p>
          </div>
          <Link href="/coins" className="text-link">
            All markets <ArrowRight size={15} />
          </Link>
        </div>
        <MarketTable markets={markets.slice(0, 8)} />
      </section>
    </>
  );
}
export function Heading({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow || "WORKSPACE / RESEARCH"}</div>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </section>
  );
}
export function MarketTable({ markets }: { markets: any[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price</th>
            <th>24h change</th>
            <th>24h volume</th>
            <th>Open interest</th>
            <th>Funding / hour</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr key={m.coin}>
              <td>
                <Link
                  className="asset-cell"
                  href={`/coins?coin=${encodeURIComponent(m.coin)}`}
                >
                  <span className="coin-icon">
                    {m.coin.split(":").pop()[0]}
                  </span>
                  <div>
                    <b>{m.coin}</b>
                    <small>{m.category}</small>
                  </div>
                </Link>
              </td>
              <td>{price(m.price)}</td>
              <td className={m.change >= 0 ? "positive" : "negative"}>
                {pct(m.change)}
              </td>
              <td>{money(m.volume)}</td>
              <td>{money(m.openInterest)}</td>
              <td className={m.funding >= 0 ? "positive" : "negative"}>
                {(m.funding * 100).toFixed(4)}%
              </td>
              <td>
                <Link
                  className="icon-button"
                  href={`/coins?coin=${encodeURIComponent(m.coin)}`}
                  aria-label={`View ${m.coin}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!markets.length && (
        <Empty title="Waiting for market data">
          Live values will appear when the source responds.
        </Empty>
      )}
    </div>
  );
}
