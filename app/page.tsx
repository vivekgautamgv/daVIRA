"use client";
import ThemeToggle from "./theme-toggle";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronDown,
  Activity,
  Layers3,
  ScanLine,
  Users,
} from "lucide-react";
import { useData, money, num } from "./terminal";
import { time } from "./ui";
const stories = [
  {
    label: "Opening a long",
    side: "BUY",
    before: "Flat",
    after: "Long",
    title: "Fresh long exposure.",
    body: "The wallet increases its long position. Count the execution as long inflow, then check whether other wallets are doing the same.",
    from: "0",
    to: "+1",
    tone: "positive",
  },
  {
    label: "Covering a short",
    side: "BUY",
    before: "Short",
    after: "Flat",
    title: "An exit can look like a buy signal.",
    body: "The wallet buys to close a short. That is short outflow. It removes bearish exposure without opening a new long.",
    from: "−1",
    to: "0",
    tone: "positive",
  },
  {
    label: "Opening a short",
    side: "SELL",
    before: "Flat",
    after: "Short",
    title: "Fresh short exposure.",
    body: "The wallet sells to open a short. Compare the size with its equity and inspect whether the move is broad or concentrated.",
    from: "0",
    to: "−1",
    tone: "negative",
  },
  {
    label: "Closing a long",
    side: "SELL",
    before: "Long",
    after: "Flat",
    title: "A reduction in risk.",
    body: "The wallet sells an existing long. It may be taking profit or cutting risk. The execution alone does not tell us its motive.",
    from: "+1",
    to: "0",
    tone: "negative",
  },
];
export default function Landing() {
  const root = useRef<HTMLElement>(null),
    [story, setStory] = useState(0),
    [paused, setPaused] = useState(false);
  const r = useData("flows?window=24h&cohort=all", 60000),
    s = useData("screener", 60000),
    rows = r.data?.data?.slice(0, 5) || [],
    active = stories[story];
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.08 },
    );
    root.current
      ?.querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <main ref={root} className={`public-site ${paused ? "motion-paused" : ""}`}>
      <header className="public-nav">
        <Link className="wordmark" href="/" aria-label="daVIRA home">
          <span className="brand-mark">dV</span>daVIRA
          <span className="brand-edition">INTELLIGENCE</span>
        </Link>
        <ThemeToggle />
        <nav aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#method">The difference</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <Link className="site-button site-button-small" href="/discover">
          Open terminal <ArrowUpRight size={15} />
        </Link>
      </header>
      <section className="public-hero">
        <div className="hero-grid-art" aria-hidden="true">
          <svg viewBox="0 0 900 650" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 22 }, (_, i) => (
              <path
                key={i}
                d={`M ${200 + i * 22} -30 C ${80 + i * 23} 160, ${500 + i * 8} 280, ${200 + i * 25} 720`}
              />
            ))}
            <path
              className="travelling-line"
              d="M 530 -30 C 420 160, 620 280, 575 720"
            />
          </svg>
          <span className="art-cross cross-a">+</span>
          <span className="art-cross cross-b">+</span>
        </div>
        <div className="hero-topline">
          <span>
            <i /> WALLET INTELLIGENCE, WITH CONTEXT
          </span>
          <span>HYPERLIQUID / EDITION 01</span>
        </div>
        <div className="public-hero-copy">
          <h1>
            Every position
            <br />
            leaves a <em>trace.</em>
          </h1>
          <p>
            Follow the wallets. Understand the flows.
            <br />
            Turn public executions into research you can act on.
          </p>
          <div className="hero-ctas">
            <Link href="/flows" className="site-button">
              Explore the intelligence <ArrowUpRight size={19} />
            </Link>
            <Link href="/discover" className="site-text-link">
              Screen the wallets <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-caption">
            Local preview · No wallet connection · No paid API required
          </div>
        </div>
        <div className="hero-bottomline">
          <span>01 / OBSERVE → INTERPRET → INVESTIGATE</span>
          <button onClick={() => setPaused(!paused)}>
            {paused ? "Resume" : "Pause"} motion
          </button>
          <a href="#platform" aria-label="Explore the platform">
            <ChevronDown size={20} />
          </a>
        </div>
      </section>
      <div className="public-proof">
        <div>
          <b>{s.data ? num(s.data.data.length) : "—"}</b>
          <span>discoverable wallets</span>
        </div>
        <div>
          <b>{s.data?.indexing?.indexed ?? "—"}</b>
          <span>execution histories indexed</span>
        </div>
        <div>
          <b>4</b>
          <span>types of position flow</span>
        </div>
        <div>
          <b>Every signal</b>
          <span>traceable to source wallets</span>
        </div>
      </div>
      <section
        id="platform"
        className="site-section product-section"
        data-reveal
      >
        <div className="section-overline">
          <span>01 / INSIDE THE TERMINAL</span>
          <span>ACTUAL INDEXED DATA</span>
        </div>
        <div className="site-section-heading">
          <h2>
            See the activity.
            <br />
            <span>Read what it means.</span>
          </h2>
          <p>
            A single workspace for wallet selection, coin flows, RWA exposure
            and execution research. Start with a question. Follow it all the way
            to the source.
          </p>
        </div>
        <div className="product-window">
          <div className="product-window-bar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <b>daVIRA / COIN INTELLIGENCE</b>
            <small>24H · All indexed wallets</small>
          </div>
          <div className="product-window-nav">
            <span className="selected">Coin flows</span>
            <Link href="/discover">Wallet screener</Link>
            <Link href="/rwa">RWA research</Link>
            <Link href="/copy">Copyability</Link>
          </div>
          <div className="product-live-table">
            <div className="product-table-head">
              <span>MARKET</span>
              <span>POSITION INFLOW</span>
              <span>POSITION OUTFLOW</span>
              <span>ACTIVITY CHARACTER</span>
              <span>WALLETS</span>
            </div>
            {rows.length ? (
              rows.map((c: any) => (
                <Link
                  key={c.coin}
                  className="product-table-row"
                  href={`/flows?coin=${encodeURIComponent(c.coin)}`}
                >
                  <strong>{c.coin}</strong>
                  <span className="positive">{money(c.inflow, 1)}</span>
                  <span>{money(c.outflow, 1)}</span>
                  <span>
                    <i className="table-status-dot" />
                    {c.insight?.behavior || "Indexed executions"}
                  </span>
                  <span>
                    {c.wallets}
                    <ArrowUpRight size={13} />
                  </span>
                </Link>
              ))
            ) : (
              <p className="product-wait">
                {r.error
                  ? "The local collector is unavailable. Start the workspace to load its data."
                  : "Reading the local execution index…"}
              </p>
            )}
          </div>
          <div className="product-window-foot">
            <span>
              Position notional · Selected sample · Latest execution{" "}
              {time(r.data?.coverage.last)}
            </span>
            <Link href="/flows">
              Inspect the evidence <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
      <section id="method" className="site-section story-section" data-reveal>
        <div className="section-overline">
          <span>02 / CONTEXT CHANGES THE READ</span>
          <span>ILLUSTRATIVE EXAMPLE</span>
        </div>
        <div className="story-layout">
          <div>
            <h2>
              A buy is only
              <br />
              <em>half the story.</em>
            </h2>
            <p>
              The same buy print can open a long or close a short. daVIRA
              reconstructs the change in exposure, so you can tell them apart.
            </p>
            <div
              className="story-tabs"
              role="tablist"
              aria-label="Execution examples"
            >
              {stories.map((x, i) => (
                <button
                  key={x.label}
                  id={`story-tab-${i}`}
                  role="tab"
                  aria-selected={i === story}
                  aria-controls="story-panel"
                  onClick={() => setStory(i)}
                >
                  <span>0{i + 1}</span>
                  {x.label}
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
          <div
            className="story-display"
            role="tabpanel"
            id="story-panel"
            aria-labelledby={`story-tab-${story}`}
          >
            <div className="story-display-header">
              <span>POSITION RECONSTRUCTION</span>
              <b className={active.tone}>{active.side}</b>
            </div>
            <div className="position-journey" key={story}>
              <div>
                <span>{active.before}</span>
                <strong>{active.from}</strong>
                <small>BEFORE</small>
              </div>
              <ArrowRight size={36} />
              <div>
                <span>{active.after}</span>
                <strong className={active.tone}>{active.to}</strong>
                <small>AFTER</small>
              </div>
            </div>
            <h3>{active.title}</h3>
            <p>{active.body}</p>
            <Link href="/flows" className="site-text-link">
              Explore actual position flows <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="site-section research-section" data-reveal>
        <div className="section-overline">
          <span>03 / ASK A BETTER QUESTION</span>
        </div>
        <div className="site-section-heading">
          <h2>
            Go beyond
            <br />
            <span>the leaderboard.</span>
          </h2>
          <p>
            The useful part is connecting the evidence. Each view answers a
            specific research question, with its assumptions visible.
          </p>
        </div>
        <div className="research-features">
          {[
            {
              icon: Users,
              title: "Is the move broad, or one wallet?",
              text: "Compare wallet-count agreement with activity concentration. Remove the biggest contributor and see whether the directional balance changes.",
              link: "/flows",
              label: "Inspect concentration",
            },
            {
              icon: Activity,
              title: "Is positioning picking up pace?",
              text: "Compare activity in equal time windows. The pace ratio stays blank when the archived baseline is too thin.",
              link: "/flows",
              label: "Read activity changes",
            },
            {
              icon: Layers3,
              title: "Where does this trader have a record?",
              text: "Compare complete trade episodes by coin, RWA specialization, holding periods and closed-PnL drawdowns.",
              link: "/rwa",
              label: "Explore specialization",
            },
            {
              icon: ScanLine,
              title: "Would the strategy survive copying?",
              text: "Review execution frequency and holding time. Stress observed PnL with extra execution costs before opening a paper trade.",
              link: "/copy",
              label: "Review execution fit",
            },
          ].map((f, i) => (
            <article key={f.title}>
              <div>
                <f.icon size={23} />
                <span>0{i + 1}</span>
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <Link href={f.link}>
                {f.label}
                <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section id="pricing" className="site-section public-pricing" data-reveal>
        <div>
          <span className="section-overline">04 / BUILT TO BE ACCESSIBLE</span>
          <h2>
            Serious research.
            <br />
            <em>A smaller bill.</em>
          </h2>
          <p>
            The value is the time you save connecting the dots. Test the local
            edition today; the hosted Core plan targets $10 per month.
          </p>
          <details>
            <summary>What is available now?</summary>
            <p>
              The local workspace includes the screener, flows, RWA and copy
              research, watchlists, alerts and paper trading. Hosted accounts
              and billing are not enabled.
            </p>
          </details>
          <details>
            <summary>How complete is the data?</summary>
            <p>
              We index a bounded wallet sample using public Hyperliquid data.
              Historical execution responses are limited. Timestamps, missing
              evidence and sample coverage remain visible.
            </p>
          </details>
          <details>
            <summary>Does this predict the next move?</summary>
            <p>
              No. Positioning provides context, not certainty. Wallets may hedge
              elsewhere. Front-running detection is deferred; no insider
              knowledge is inferred.
            </p>
          </details>
        </div>
        <div className="core-price">
          <div>
            <span>CORE / PLANNED HOSTED EDITION</span>
            <span className="price-tag">$10 target</span>
          </div>
          <strong>
            $10<small>/ month</small>
          </strong>
          <p>
            One research workflow.
            <br />
            From the wallet to the decision.
          </p>
          <ul>
            {[
              "Advanced wallet screening & saved views",
              "Coin flows with source-wallet attribution",
              "Concentration, agreement & activity pace",
              "RWA specialization & per-coin scores",
              "Copy research & paper journal",
            ].map((x) => (
              <li key={x}>
                <Check size={16} />
                {x}
              </li>
            ))}
          </ul>
          <Link href="/discover" className="site-button">
            Try the local edition <ArrowUpRight size={18} />
          </Link>
          <small>Free local preview. No checkout or subscription starts.</small>
        </div>
      </section>
      <section className="public-final" data-reveal>
        <span>YOUR NEXT THESIS STARTS WITH EVIDENCE.</span>
        <h2>Follow the trace.</h2>
        <Link href="/flows" className="site-button">
          Open coin intelligence <ArrowUpRight size={20} />
        </Link>
        <div className="final-lines" aria-hidden="true" />
      </section>
      <footer className="public-footer">
        <Link href="/" className="wordmark">
          <span className="brand-mark">dV</span>daVIRA
        </Link>
        <span>Independent research. Public data. Visible assumptions.</span>
        <Link href="/settings">
          Sources & coverage <ArrowUpRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
