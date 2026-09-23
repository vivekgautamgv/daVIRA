"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Crosshair,
  Globe2,
  Layers3,
  Menu,
  Pause,
  Play,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Mark from "./brand-mark";
import ThemeToggle from "./theme-toggle";
import { money, num, short, useData } from "./terminal";
import s from "./landing.module.css";

type Coin = {
  coin: string;
  wallets: number;
  longIn: number;
  longOut: number;
  shortIn: number;
  shortOut: number;
  insight?: { leaderShare: number };
};
type Wallet = {
  address: string;
  name?: string;
  equity: number;
  pnl30d: number | null;
  analysis?: { coins: { coin: string }[]; stats: { completeTrades: number } };
};
function IntelligenceLens() {
  return (
    <div
      className={s.lens}
      aria-label="Illustration of wallet observations becoming market context"
    >
      <div className={s.lensTop}>
        <span>THE INTELLIGENCE LAYER</span>
        <span>01 — 03</span>
      </div>
      <svg viewBox="0 0 620 520" fill="none" aria-hidden="true">
        <defs>
          <linearGradient
            id="lensFill"
            x1="200"
            y1="70"
            x2="440"
            y2="440"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fb6a2e" stopOpacity=".28" />
            <stop offset="1" stopColor="#db471b" stopOpacity=".02" />
          </linearGradient>
          <linearGradient
            id="lensStroke"
            x1="190"
            y1="100"
            x2="440"
            y2="430"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fc7948" />
            <stop offset=".5" stopColor="#d44619" />
            <stop offset="1" stopColor="#ef8259" stopOpacity=".3" />
          </linearGradient>
        </defs>
        <g className={s.lensGrid} stroke="currentColor" strokeWidth=".6">
          {[100, 200, 300, 400, 500].map((x) => (
            <path key={x} d={`M${x} 30V480`} />
          ))}
          {[100, 200, 300, 400].map((y) => (
            <path key={y} d={`M20 ${y}H600`} />
          ))}
        </g>
        <g className={s.traces} stroke="currentColor">
          <path d="M30 146H116L206 214" />
          <path d="M12 283H194" />
          <path d="M62 390H125L202 327" />
          <path d="M406 195 487 136H592" />
          <path d="M426 278H604" />
          <path d="M415 349 474 397H570" />
        </g>
        <ellipse
          cx="312"
          cy="270"
          rx="121"
          ry="183"
          transform="rotate(25 312 270)"
          fill="url(#lensFill)"
        />
        <g stroke="url(#lensStroke)" strokeWidth="1.2" className={s.lensOrb}>
          {Array.from({ length: 15 }, (_, i) => (
            <ellipse
              key={i}
              cx="312"
              cy="270"
              rx={17 + i * 7.5}
              ry="183"
              transform={`rotate(${25 + i * 2} 312 270)`}
            />
          ))}
          <ellipse
            cx="312"
            cy="270"
            rx="192"
            ry="47"
            transform="rotate(-28 312 270)"
          />
          <ellipse
            cx="312"
            cy="270"
            rx="192"
            ry="86"
            transform="rotate(-28 312 270)"
          />
        </g>
        <g
          className={s.signalTravel}
          stroke="#e65a28"
          strokeWidth="3"
          strokeDasharray="3 240"
        >
          <path d="M30 146H116L206 214" />
          <path d="M12 283H194" />
          <path d="M62 390H125L202 327" />
          <path d="M406 195 487 136H592" />
          <path d="M426 278H604" />
          <path d="M415 349 474 397H570" />
        </g>
        {[
          [116, 146],
          [62, 283],
          [125, 390],
          [487, 136],
          [565, 278],
          [474, 397],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill="#ed612e" />
            <circle
              className={s.nodePulse}
              style={{ animationDelay: `${i * 0.55}s` }}
              cx={x}
              cy={y}
              r="11"
              stroke="#ed612e"
              strokeWidth=".8"
            />
          </g>
        ))}
        <circle cx="312" cy="270" r="29" fill="#e65a28" />
        <path d="m295 258 17 28 17-28h-9l-8 15-8-15h-9Z" fill="#fff4e7" />
        <g
          fill="currentColor"
          className={s.lensLabels}
          fontSize="10"
          letterSpacing="1.5"
        >
          <text x="30" y="125">
            WALLET HISTORY
          </text>
          <text x="16" y="262">
            POSITION CHANGES
          </text>
          <text x="64" y="418">
            EXECUTIONS
          </text>
          <text x="500" y="119">
            BTC
          </text>
          <text x="555" y="259">
            ETH
          </text>
          <text x="492" y="419">
            HYPE
          </text>
        </g>
        <path
          d="M300 42h24m-12-12v24M300 484h24m-12-12v24"
          stroke="currentColor"
          opacity=".4"
        />
      </svg>
      <div className={s.lensBottom}>
        <span>OBSERVE</span>
        <i />
        <span>INTERPRET</span>
        <i />
        <span>ACT</span>
      </div>
    </div>
  );
}
const steps = [
  {
    title: "Find the right wallets.",
    text: "Start with a trader’s record in your coin. Compare realized results, drawdown, consistency and the depth of the evidence.",
    link: "/discover",
    cta: "Discover traders",
  },
  {
    title: "Understand their positioning.",
    text: "New longs or shorts being closed? Follow opening and closing activity, wallet agreement and concentration in each market.",
    link: "/flows?coin=ETH",
    cta: "Explore coin flows",
  },
  {
    title: "Build your own thesis.",
    text: "Bring wallet behaviour, market context and execution costs together. Track the idea, challenge it and test it on paper.",
    link: "/paper",
    cta: "Open strategy workspace",
  },
];
const playbooks = [
  {
    name: "Accumulation",
    question: "Are experienced wallets adding fresh risk?",
    checks: [
      "Separate new longs from short covering",
      "Compare current activity with the earlier window",
      "Check whether several independent wallets agree",
    ],
    path: "/flows?coin=ETH",
  },
  {
    name: "Crowded positioning",
    question: "Does the consensus survive without the largest wallet?",
    checks: [
      "Inspect the largest contributor’s share",
      "Compare quality, large-wallet and watchlist cohorts",
      "Check open exposure and concentration",
    ],
    path: "/dashboard",
  },
  {
    name: "Exit pressure",
    question: "Are the wallets behind the move starting to leave?",
    checks: [
      "Separate long exits from new short positions",
      "Review changes across followed wallets",
      "Write down what would invalidate the thesis",
    ],
    path: "/watchlist",
  },
];
const faq = [
  [
    "What can I use today?",
    "The research terminal includes Hyperliquid wallet discovery, coin positioning, wallet profiles, watchlists with in-app activity alerts, RWA research, market briefs and paper trading. Open the demo to inspect the current sample and source coverage.",
  ],
  [
    "What does pre-move research mean?",
    "Our planned research will look for wallets that repeatedly opened positions before large price moves. The methodology is still being developed. No pre-move rankings or predictive claims are available today. Early positioning alone does not establish insider knowledge or manipulative front-running.",
  ],
  [
    "Can daVIRA trade for me?",
    "Today, daVIRA supports copy research and paper simulations. It does not send live exchange orders. Scores describe observed records and execution constraints; they do not guarantee future returns.",
  ],
  [
    "Is the $10 plan available?",
    "$10 per month is the target price for the planned Core subscription. The current edition is a research demo. Customer accounts, checkout and subscriptions are not active yet.",
  ],
];

export default function Landing() {
  const root = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false),
    [paused, setPaused] = useState(false),
    [tab, setTab] = useState("wallets"),
    [coin, setCoin] = useState(""),
    [playbook, setPlaybook] = useState(0),
    [cost, setCost] = useState(10);
  const flow = useData("flows?window=24h&cohort=all", 60000),
    screener = useData("screener", 60000);
  const coins: Coin[] = (flow.data?.data || []).slice(0, 6),
    selected = coins.find((c) => c.coin === coin) || coins[0];
  const wallets: Wallet[] = (screener.data?.data || [])
    .filter(
      (w: Wallet) =>
        w.equity > 0 &&
        w.pnl30d != null &&
        w.pnl30d > 0 &&
        (w.analysis?.stats.completeTrades || 0) >= 5,
    )
    .sort((a: Wallet, b: Wallet) => (b.pnl30d || 0) - (a.pnl30d || 0))
    .slice(0, 4);
  const flows = selected
    ? [
        { label: "New longs", value: selected.longIn, tone: s.green },
        { label: "Long exits", value: selected.longOut, tone: s.faded },
        { label: "New shorts", value: selected.shortIn, tone: s.coral },
        { label: "Short covering", value: selected.shortOut, tone: s.faded },
      ]
    : [];
  const marketPath = selected
    ? `/flows?coin=${encodeURIComponent(selected.coin)}`
    : "/flows";
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(s.visible);
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    root.current
      ?.querySelectorAll(`.${s.reveal}`)
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <main id="top" ref={root} className={`${s.site} ${paused ? s.paused : ""}`}>
      <a href="#platform" className={s.skip}>
        Skip to product
      </a>
      <header className={s.header}>
        <Link href="/" aria-label="daVIRA home" className={s.brand}>
          <Mark />
          daVIRA<span>INTELLIGENCE</span>
        </Link>
        <nav
          className={`${s.nav} ${menu ? s.navOpen : ""}`}
          aria-label="Main navigation"
          id="home-navigation"
        >
          <a href="#platform" onClick={() => setMenu(false)}>
            Platform
          </a>
          <a href="#research" onClick={() => setMenu(false)}>
            Research frontier
          </a>
          <a href="#vision" onClick={() => setMenu(false)}>
            Our vision
          </a>
          <a href="#access" onClick={() => setMenu(false)}>
            Access
          </a>
        </nav>
        <div className={s.headerActions}>
          <ThemeToggle defaultTheme="light" />
          <Link href="/summary" className={s.headerCta}>
            Open terminal <ArrowUpRight size={15} />
          </Link>
          <button
            className={s.menuButton}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="home-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>
      <section className={s.hero} aria-labelledby="home-title">
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <a href="#platform" className={s.announcement}>
              <span>RESEARCH PREVIEW</span> Built on Hyperliquid{" "}
              <ArrowUpRight size={14} />
            </a>
            <h1 id="home-title">
              Read the money.
              <br />
              Build your <span>edge.</span>
            </h1>
            <p className={s.heroLead}>
              The intelligence behind your next trade.
            </p>
            <p className={s.heroText}>
              Know who is taking risk. Understand where conviction is building.
              Turn smart money activity into a strategy of your own.
            </p>
            <div className={s.heroActions}>
              <Link href="/summary" className={s.primary}>
                Explore the intelligence <ArrowUpRight size={18} />
              </Link>
              <a href="#platform" className={s.textLink}>
                See it in action <ArrowDown size={16} />
              </a>
            </div>
            <div className={s.heroFor}>
              FOR INDEPENDENT TRADERS <span>/</span> RESEARCHERS <span>/</span>{" "}
              TRADING DESKS
            </div>
          </div>
          <IntelligenceLens />
        </div>
        <div className={s.heroFoot}>
          <span>
            <i /> PUBLIC DATA. A DEEPER PERSPECTIVE.
          </span>
          <span>INDIA → GLOBAL MARKETS</span>
          <button
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
            aria-label={paused ? "Resume animations" : "Pause animations"}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}{" "}
            {paused ? "Resume motion" : "Pause motion"}
          </button>
        </div>
      </section>

      <section
        id="platform"
        className={s.platform}
        aria-labelledby="platform-title"
      >
        <div className={`${s.sectionHeading} ${s.reveal}`}>
          <div>
            <span className={s.eyebrow}>01 / THE PLATFORM</span>
            <h2 id="platform-title">
              A clearer view.
              <br />
              <span>A sharper decision.</span>
            </h2>
          </div>
          <p>
            The wallet. The position. The bigger picture.
            <br />
            Connected in one research terminal.
          </p>
        </div>
        <div className={`${s.terminal} ${s.reveal}`}>
          <div className={s.terminalTop}>
            <span>
              <Mark />
              daVIRA <small>/ INTELLIGENCE TERMINAL</small>
            </span>
            <span className={s.liveStatus}>
              <i className={flow.error || screener.error ? s.offline : ""} />
              {flow.error || screener.error
                ? "Source unavailable"
                : flow.loading || screener.loading
                  ? "Connecting"
                  : "Connected to local collector"}
            </span>
          </div>
          <div className={s.terminalBody}>
            <div
              className={s.productTabs}
              role="tablist"
              aria-label="Product preview"
              aria-orientation="vertical"
              onKeyDown={(e) => {
                const ids = ["wallets", "flows", "strategy"],
                  i = ids.indexOf(tab);
                let n = i;
                if (e.key === "ArrowDown") n = (i + 1) % 3;
                else if (e.key === "ArrowUp") n = (i + 2) % 3;
                else if (e.key === "Home") n = 0;
                else if (e.key === "End") n = 2;
                else return;
                e.preventDefault();
                setTab(ids[n]);
                document.getElementById(`preview-${ids[n]}`)?.focus();
              }}
            >
              {[
                ["wallets", "01", "Wallet intelligence"],
                ["flows", "02", "Coin positioning"],
                ["strategy", "03", "Strategy research"],
              ].map(([id, n, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  id={`preview-${id}`}
                  tabIndex={tab === id ? 0 : -1}
                  className={tab === id ? s.tabActive : ""}
                  onClick={() => setTab(id)}
                >
                  <small>{n}</small>
                  <span>{label}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
              <div className={s.terminalAside}>
                <Crosshair size={23} />
                <p>
                  Follow the evidence
                  <br />
                  behind the conviction.
                </p>
                <span>HYPERLIQUID / V1</span>
              </div>
            </div>
            <div
              className={s.previewPanel}
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`preview-${tab}`}
              tabIndex={0}
            >
              {tab === "wallets" && (
                <>
                  <div className={s.previewHeading}>
                    <div>
                      <span>WALLET DISCOVERY</span>
                      <h3>Performance in context.</h3>
                    </div>
                    <Link
                      href="/discover"
                      aria-label="Open full wallet screener"
                    >
                      <ArrowUpRight size={22} />
                    </Link>
                  </div>
                  <div className={s.previewMetrics}>
                    <div>
                      <strong>
                        {screener.data
                          ? num(screener.data.data?.length || 0)
                          : "—"}
                      </strong>
                      <span>wallets in the screener</span>
                    </div>
                    <div>
                      <strong>
                        {flow.data?.coverage?.indexedWallets == null
                          ? "—"
                          : num(flow.data.coverage.indexedWallets)}
                      </strong>
                      <span>execution histories indexed</span>
                    </div>
                    <div>
                      <strong>By coin</strong>
                      <span>research trader specialization</span>
                    </div>
                  </div>
                  <div className={s.previewTableWrap}>
                    <table className={s.previewTable}>
                      <thead>
                        <tr>
                          <th>Trader / wallet</th>
                          <th>Reported 30D PnL</th>
                          <th>Top traded coin</th>
                          <th>Complete trades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallets.map((w) => (
                          <tr key={w.address}>
                            <td>
                              <Link href={`/wallet/${w.address}`}>
                                <span className={s.walletIcon}>
                                  {(w.name ||
                                    w.address.slice(2))[0].toUpperCase()}
                                </span>
                                <span>
                                  <b>{w.name || short(w.address)}</b>
                                  <small>{short(w.address)}</small>
                                </span>
                              </Link>
                            </td>
                            <td className={s.green}>
                              {w.pnl30d == null ? "—" : money(w.pnl30d, 1)}
                            </td>
                            <td>
                              <span className={s.coinTag}>
                                {w.analysis?.coins?.[0]?.coin || "—"}
                              </span>
                            </td>
                            <td>{w.analysis?.stats.completeTrades ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!wallets.length && (
                      <p className={s.empty}>
                        {screener.error
                          ? "Wallet data is temporarily unavailable. Explore the research tools below."
                          : screener.loading
                            ? "Reading the current wallet sample…"
                            : "Wallets appear here after their execution histories are indexed."}
                      </p>
                    )}
                  </div>
                  <div className={s.previewNote}>
                    <span>
                      Sample ranked by reported PnL · 5+ complete observed
                      trades · history may be partial
                    </span>
                    <Link href="/discover">
                      Full screener <ArrowRight size={13} />
                    </Link>
                  </div>
                </>
              )}
              {tab === "flows" && (
                <>
                  <div className={s.previewHeading}>
                    <div>
                      <span>COIN POSITIONING / 24H</span>
                      <h3>Know what the buying means.</h3>
                    </div>
                    <Link href={marketPath} aria-label="Open coin positioning">
                      <ArrowUpRight size={22} />
                    </Link>
                  </div>
                  <div className={s.coinPicker} aria-label="Select market">
                    {coins.map((c) => (
                      <button
                        key={c.coin}
                        aria-pressed={selected?.coin === c.coin}
                        onClick={() => setCoin(c.coin)}
                      >
                        {c.coin}
                      </button>
                    ))}
                  </div>
                  {selected ? (
                    <>
                      <div className={s.flowBars}>
                        {flows.map((f) => (
                          <div key={f.label}>
                            <span>{f.label}</span>
                            <div>
                              <i
                                className={f.tone}
                                style={{
                                  width: `${Math.max(1, (f.value / Math.max(...flows.map((x) => x.value), 1)) * 100)}%`,
                                }}
                              />
                            </div>
                            <b>{money(f.value, 1)}</b>
                          </div>
                        ))}
                      </div>
                      <div className={s.flowRead}>
                        <span>
                          <b>{selected.wallets}</b> contributing wallets
                        </span>
                        <span>
                          <b>
                            {selected.insight?.leaderShare == null
                              ? "—"
                              : `${selected.insight.leaderShare.toFixed(0)}%`}
                          </b>{" "}
                          largest wallet share
                        </span>
                        <Link href={marketPath}>
                          Investigate {selected.coin} <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className={s.empty}>
                      {flow.error
                        ? "Coin data is temporarily unavailable."
                        : "Waiting for indexed coin executions…"}
                    </p>
                  )}
                  <p className={s.previewNote}>
                    Observed opening and closing notional. These are position
                    flows, not deposits and withdrawals.
                  </p>
                </>
              )}
              {tab === "strategy" && (
                <>
                  <div className={s.previewHeading}>
                    <div>
                      <span>RESEARCH PLAYBOOKS</span>
                      <h3>Build a thesis you can test.</h3>
                    </div>
                    <Crosshair size={23} />
                  </div>
                  <div className={s.coinPicker}>
                    {playbooks.map((p, i) => (
                      <button
                        key={p.name}
                        aria-pressed={i === playbook}
                        onClick={() => setPlaybook(i)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div className={s.playbook}>
                    <span>THE QUESTION</span>
                    <h4>{playbooks[playbook].question}</h4>
                    <ul>
                      {playbooks[playbook].checks.map((t) => (
                        <li key={t}>
                          <Check size={16} />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <Link href={playbooks[playbook].path}>
                      Investigate the evidence <ArrowUpRight size={16} />
                    </Link>
                  </div>
                  <p className={s.previewNote}>
                    Research frameworks, not current trade signals. Record and
                    test ideas in the paper journal.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className={s.terminalBottom}>
            <span>
              <ShieldCheck size={13} /> SOURCE-LINKED RESEARCH
            </span>
            <span>WALLET → POSITION → STRATEGY</span>
            <Link href="/settings">
              View data coverage <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
        <div className={`${s.productFoot} ${s.reveal}`}>
          <span>BUILT AROUND YOUR MARKET</span>
          <div>
            <b>CRYPTO</b>
            <i />
            <b>PERPETUALS</b>
            <i />
            <b>TOKENIZED EQUITIES</b>
            <i />
            <b>COMMODITIES</b>
          </div>
          <span>SELECTED HYPERLIQUID MARKETS</span>
        </div>
      </section>

      <section className={s.workflow} id="workflow">
        <div className={`${s.workflowIntro} ${s.reveal}`}>
          <span className={s.eyebrow}>02 / FROM OBSERVATION TO CONVICTION</span>
          <h2>
            The chart shows the move.
            <br />
            <span>We help you read the intent.</span>
          </h2>
          <p>
            A position is a clue. A record gives it context.
            <br />
            Build a repeatable process around both.
          </p>
        </div>
        <div className={s.steps}>
          {steps.map((item, i) => (
            <article className={s.reveal} key={item.title}>
              <div className={s.stepLine}>
                <span>0{i + 1}</span>
                <ArrowRight size={22} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Link href={item.link}>
                {item.cta}
                <ArrowUpRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={s.tools} aria-labelledby="tools-title">
        <div className={`${s.sectionHeading} ${s.reveal}`}>
          <div>
            <span className={s.eyebrow}>03 / YOUR RESEARCH ADVANTAGE</span>
            <h2 id="tools-title">
              Less searching.
              <br />
              <span>More understanding.</span>
            </h2>
          </div>
          <p>
            Go beyond a leaderboard.
            <br />
            Follow the behaviour that makes a record.
          </p>
        </div>
        <div className={s.toolGrid}>
          <article className={`${s.specialistCard} ${s.reveal}`}>
            <div className={s.cardHeading}>
              <span>01 / COIN SPECIALISTS</span>
              <Search size={19} />
            </div>
            <h3>
              The right trader.
              <br />
              For the market you trade.
            </h3>
            <p>
              A strong BTC record says little about ETH. See a wallet’s history
              by token, then inspect the trades behind its performance.
            </p>
            <div
              className={s.specialistVisual}
              aria-label="Coin research workflow illustration"
            >
              <div>
                <span className={s.token}>₿</span>
                <strong>BTC</strong>
                <span>WALLET HISTORY</span>
              </div>
              <div>
                <span className={`${s.token} ${s.ethToken}`}>Ξ</span>
                <strong>ETH</strong>
                <span>COIN-LEVEL PNL</span>
              </div>
              <div>
                <span className={`${s.token} ${s.hypeToken}`}>H</span>
                <strong>HYPE</strong>
                <span>RISK & CONSISTENCY</span>
              </div>
              <span className={s.visualCaption}>
                ONE WALLET. DIFFERENT MARKETS. DIFFERENT RECORDS.
              </span>
            </div>
            <Link href="/discover">
              Find coin specialists <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className={`${s.watchCard} ${s.reveal}`}>
            <div className={s.cardHeading}>
              <span>02 / WALLET ACTIVITY</span>
              <Bell size={19} />
            </div>
            <h3>
              Your watchlist.
              <br />
              One complete picture.
            </h3>
            <p>
              See followed wallets’ positions and orders together. In-app alerts
              surface newly observed orders, fills and position changes.
            </p>
            <div
              className={s.alertVisual}
              aria-label="Wallet monitoring workflow"
            >
              <div>
                <i />
                <span>WATCHLIST MONITOR</span>
                <span>OBSERVE → ALERT</span>
              </div>
              {[
                ["01", "Order observed"],
                ["02", "Execution detected"],
                ["03", "Position updated"],
              ].map(([n, t], i) => (
                <div
                  key={n}
                  className={s.alertRow}
                  style={{ "--delay": `${i * 1.3}s` } as CSSProperties}
                >
                  <span>{n}</span>
                  <b>{t}</b>
                  <ArrowUpRight size={14} />
                </div>
              ))}
            </div>
            <Link href="/watchlist">
              Build your watchlist <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className={`${s.copyCard} ${s.reveal}`}>
            <div className={s.cardHeading}>
              <span>03 / COPY RESEARCH</span>
              <Layers3 size={19} />
            </div>
            <h3>
              Great returns.
              <br />
              But can you follow?
            </h3>
            <p>
              Evaluate activity, holding time, drawdown and costs before copying
              a trading style.
            </p>
            <div className={s.costLab}>
              <label htmlFor="cost-drag">
                EXTRA EXECUTION COST <strong>{cost} bps</strong>
              </label>
              <input
                id="cost-drag"
                type="range"
                min="0"
                max="25"
                step="5"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
              />
              <div>
                <span>On a $10,000 order</span>
                <b>{money(cost)}</b>
              </div>
              <small>Illustrative one-way cost, before exchange fees.</small>
            </div>
            <Link href="/copy">
              Evaluate execution fit <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className={`${s.briefCard} ${s.reveal}`}>
            <div className={s.cardHeading}>
              <span>04 / MARKET CONTEXT</span>
              <Globe2 size={19} />
            </div>
            <h3>
              Connect the trade
              <br />
              to the bigger picture.
            </h3>
            <p>
              Coin briefs, tokenized market exposure and macro events. Research
              the conditions around the position.
            </p>
            <div className={s.briefLinks}>
              <Link href="/reports?coin=BTC">
                <span>Coin research briefs</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link href="/rwa">
                <span>RWA & tokenized markets</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link href="/calendar">
                <span>Macro calendar & news</span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section
        id="research"
        className={s.frontier}
        aria-labelledby="frontier-title"
      >
        <div className={s.frontierInner}>
          <div className={`${s.frontierTop} ${s.reveal}`}>
            <span className={s.eyebrow}>04 / THE RESEARCH FRONTIER</span>
            <span className={s.futureBadge}>IN DEVELOPMENT · NOT YET LIVE</span>
          </div>
          <div className={s.preMove}>
            <div className={s.reveal}>
              <h2 id="frontier-title">
                Who saw the
                <br />
                move coming?
              </h2>
              <p className={s.frontierLead}>
                Some wallets enter before the crowd.
                <br />
                We want to understand why.
              </p>
              <p>
                Our pre-move research will study historical entries ahead of
                outsized price moves—and whether that timing repeats across
                different market conditions.
              </p>
              <div className={s.researchChecks}>
                <span>
                  <Plus size={13} /> Entry timing
                </span>
                <span>
                  <Plus size={13} /> Repeatability
                </span>
                <span>
                  <Plus size={13} /> False positives
                </span>
              </div>
            </div>
            <div className={`${s.preMoveChart} ${s.reveal}`}>
              <div>
                <span>PRE-MOVE WALLET RESEARCH</span>
                <span>CONCEPT DIAGRAM</span>
              </div>
              <svg
                viewBox="0 0 600 280"
                fill="none"
                role="img"
                aria-label="Concept illustration: compare wallet entries before a price move with later outcomes; no historical results shown"
              >
                <path
                  d="M20 70H580M20 140H580M20 210H580"
                  stroke="currentColor"
                  opacity=".16"
                />
                <path
                  d="M344 28V245"
                  stroke="currentColor"
                  strokeDasharray="4 6"
                  opacity=".35"
                />
                <path
                  className={s.priceTrace}
                  d="M20 214 52 212 71 218 101 205 120 211 147 201 171 205 192 189 209 200 232 191 254 196 276 178 300 185 322 172 345 166 360 136 378 145 392 108 412 120 427 76 449 94 467 51 491 62 510 33 532 44 553 24 580 32"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <path
                  d="M101 240V205M192 240V189M276 240V178"
                  stroke="currentColor"
                  opacity=".5"
                />
                {[
                  [101, 205],
                  [192, 189],
                  [276, 178],
                ].map(([x, y], i) => (
                  <g key={x}>
                    <circle cx={x} cy={y} r="5" fill="currentColor" />
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      stroke="currentColor"
                      opacity=".5"
                      className={s.nodePulse}
                      style={{ animationDelay: `${i}s` }}
                    />
                  </g>
                ))}
                <text
                  x="65"
                  y="264"
                  fill="currentColor"
                  fontSize="10"
                  letterSpacing="1"
                >
                  OBSERVED ENTRIES
                </text>
                <text
                  x="389"
                  y="264"
                  fill="currentColor"
                  fontSize="10"
                  letterSpacing="1"
                >
                  LATER PRICE MOVE
                </text>
              </svg>
              <p>
                The objective: distinguish a repeatable pattern from a lucky
                entry. Methodology and validation are pending.
              </p>
            </div>
          </div>
          <div className={s.frontierCards}>
            <article className={s.reveal}>
              <span>RESEARCH DIRECTION / 01</span>
              <div className={s.migrationArt} aria-hidden="true">
                <span>0x…A</span>
                <i />
                <ArrowRight size={16} />
                <i />
                <span>0x…B</span>
                <i />
                <span>?</span>
              </div>
              <h3>
                Follow the capital.
                <br />
                Even when the wallet changes.
              </h3>
              <p>
                Investigate funding links and behavioural continuity when a
                trader moves to a new address. Show evidence and uncertainty for
                each possible connection.
              </p>
              <small>PLANNED / WALLET CONTINUITY</small>
            </article>
            <article className={s.reveal}>
              <span>RESEARCH DIRECTION / 02</span>
              <div className={s.promptArt}>
                <span>Which ETH specialists are adding risk?</span>
                <ArrowUpRight size={18} />
              </div>
              <h3>
                Complex research.
                <br />
                One plain-language question.
              </h3>
              <p>
                Our planned AI research layer will turn questions into sourced
                wallet and market analysis, with the underlying evidence one
                click away.
              </p>
              <small>PLANNED / AI RESEARCH & MULTICHAIN COVERAGE</small>
            </article>
          </div>
        </div>
      </section>

      <section id="vision" className={s.vision}>
        <div className={`${s.visionIntro} ${s.reveal}`}>
          <span className={s.eyebrow}>
            05 / BUILT IN INDIA. THINKING GLOBALLY.
          </span>
          <h2>
            Intelligence is
            <br />
            just the beginning.
          </h2>
          <p>
            We’re building toward a global digital asset firm. The foundation is
            transparent research: understand how capital moves, develop
            strategies from the evidence, and earn the right to take the next
            step.
          </p>
          <span className={s.founder}>
            VIVEK GAUTAM <i /> FOUNDER, daVIRA
          </span>
        </div>
        <div className={s.roadmap}>
          <article className={`${s.reveal} ${s.currentPhase}`}>
            <div>
              <span>01</span>
              <small>BUILDING NOW</small>
            </div>
            <h3>Intelligence</h3>
            <p>
              Smart money tracking and decision research for independent traders
              and trading desks. Hyperliquid first; broader onchain coverage is
              the next ambition.
            </p>
            <b>Observe → Understand</b>
          </article>
          <article className={s.reveal}>
            <div>
              <span>02</span>
              <small>FUTURE PHASE</small>
            </div>
            <h3>
              Proprietary research
              <br />& trading
            </h3>
            <p>
              Develop and test our own strategies around market structure,
              recurring patterns and measurable inefficiencies.
            </p>
            <b>Research → Validate</b>
          </article>
          <article className={s.reveal}>
            <div>
              <span>03</span>
              <small>LONG-TERM VISION</small>
            </div>
            <h3>Market making</h3>
            <p>
              Build the execution and risk capabilities to provide liquidity in
              digital asset markets. From India, serving global markets.
            </p>
            <b>Execute → Provide liquidity</b>
          </article>
        </div>
      </section>
      <section className={s.standard}>
        <div className={`${s.standardIntro} ${s.reveal}`}>
          <ShieldCheck size={28} />
          <h2>
            Conviction starts
            <br />
            with credibility.
          </h2>
          <p>
            Every number should have a source.
            <br />
            Every conclusion should have a limit.
          </p>
        </div>
        <div className={s.standardItems}>
          {[
            [
              "01",
              "Traceable observations",
              "Inspect the source wallet, execution and time window behind the analysis.",
            ],
            [
              "02",
              "Visible uncertainty",
              "Sample depth, refresh times and missing history stay alongside the evidence.",
            ],
            [
              "03",
              "Your judgment comes first",
              "Scores support research. Positioning is not a promise about the next price move.",
            ],
          ].map(([n, t, p]) => (
            <div key={n} className={s.reveal}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section id="access" className={s.access}>
        <div className={`${s.accessCopy} ${s.reveal}`}>
          <span className={s.eyebrow}>06 / AN EDGE WITHIN REACH</span>
          <h2>
            Big-picture intelligence.
            <br />
            Independent-trader access.
          </h2>
          <p>
            Better research should be part of your process.
            <br />
            We’re building daVIRA to make that possible.
          </p>
          <Link href="/summary" className={s.primary}>
            Explore the research demo <ArrowUpRight size={18} />
          </Link>
          <small>Current demo available · No wallet connection required</small>
        </div>
        <div className={`${s.priceCard} ${s.reveal}`}>
          <div>
            <span>daVIRA CORE</span>
            <span>PLANNED SUBSCRIPTION</span>
          </div>
          <p className={s.price}>
            $10<span>/ month</span>
          </p>
          <p>Target pricing for the hosted edition.</p>
          <ul>
            {[
              "Wallet & coin intelligence",
              "Watchlists & observed activity alerts",
              "Market context & research briefs",
              "Copy research & paper trading",
            ].map((x) => (
              <li key={x}>
                <Check size={15} />
                {x}
              </li>
            ))}
          </ul>
          <span className={s.priceFoot}>
            Hosted accounts and billing are not live yet.
          </span>
        </div>
      </section>
      <section className={s.faq}>
        <span className={s.eyebrow}>A FEW THINGS WORTH KNOWING</span>
        <div>
          {faq.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <Link href="/" className={s.brand}>
            <Mark />
            daVIRA
          </Link>
          <p>Read the money. Build your edge.</p>
          <a href="#top">
            Back to top <ArrowUpRight size={15} />
          </a>
        </div>
        <div className={s.footerLinks}>
          <span>SMART MONEY. INDEPENDENT THINKING.</span>
          <Link href="/discover">Wallets</Link>
          <Link href="/flows">Coin intelligence</Link>
          <Link href="/watchlist">Watchlist</Link>
          <Link href="/settings">Data & methodology</Link>
        </div>
        <div className={s.bigWordmark} aria-hidden="true">
          daVIRA<span>↗</span>
        </div>
        <div className={s.footerBottom}>
          <span>© {new Date().getFullYear()} daVIRA</span>
          <span>BUILT IN INDIA / FOR GLOBAL MARKETS</span>
          <span>Independent market research</span>
        </div>
      </footer>
    </main>
  );
}
