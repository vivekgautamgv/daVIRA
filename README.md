# daVIRA — local V1

A Hyperliquid smart-money research terminal with a separate landing page. Real public data, persistent local storage, no paid API key or cloud account required.

## Run locally

Requirements: Node.js **24 or later**, npm, internet access.

```powershell
cd D:\daVIRA
npm ci
npm run dev
```

Open **http://127.0.0.1:3000** for the landing page and **http://127.0.0.1:3000/discover** for the wallet screener. Keep the command running to collect new observations. Initial cohort discovery can take 30–60 seconds. Press Ctrl+C to stop.

No `.env.local` is needed. The launcher creates a random private engine token. Existing Supabase/Stripe environment variables are not used. See `.env.local.example` for optional ports and storage paths. Do not commit secrets.

For a production-mode local run, stop development first:

```powershell
npm run build
npm start
```

## Latest product improvements

- **Trade setups (`/setups`)** pair the existing evidence-gated wallet bias with fresh main-DEX quotes and completed 1H candles. A 12-bar structural stop and ATR buffer produce 1R/2R/3R research scenarios; trend conflict, stale or incomplete data, and excessive stop distance produce Wait. Account risk sizing is calculated locally, independent of wallet leverage, with daily/open-risk limits and estimated costs. This is an unvalidated research model, not order execution or a return forecast.
- **Shared brand system** carries the landing page’s folded-V mark and ivory/graphite/orange palette through the terminal. Financial gains and losses retain separate green/red colours; theme preference persists across pages.

- Institutional landing page with ivory/graphite themes, an animated intelligence diagram, live wallet and coin previews, interactive research playbooks and execution-cost illustration. Dedicated sections explain planned pre-move analysis, wallet continuity, AI research and the three-phase vision; future capabilities and target pricing remain labeled.
- Category-led discovery with counts, eligibility explanations and direct wallet lookup.
- Coin flows now offer large-wallet, quality, watchlist and all-indexed cohorts.
- Research layer decomposes entry/exit activity, wallet agreement, largest-contributor concentration and baseline-gated activity pace.
- See [Product value and Core plan](docs/PRODUCT_VALUE.md) for the paid-value hypothesis and explicit scope limits.

## What is implemented

| Area                  | Working V1 behavior                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing page          | Product explanation, live cohort preview, methodology, links into the workspace. $10/month is labeled a future pricing target.                                                                      |
| Smart-money desk      | Automatic research sample of up to 40 profitable leaderboard wallets plus up to 20 user-followed wallets. Per-asset long/short exposure, concentration, source wallet drill-down, movement ledger. |
| Heavy wallet screener | 2,000 leaderboard wallets plus indexed discoveries; quality, holding time, closed-trade count, exposure and asset filters; three table views; saved screens, CSV export, three-wallet comparison.  |
| Coin flows            | 1H/6H/24H/7D opening and closing notional, split into long/short components, timeline and source-wallet attribution. These are position flows, not collateral transfers.                           |
| RWA research          | Classified equity, index, commodity and FX derivatives; wallet turnover share, coin scores, selected builder DEX positions. RWA tokens such as ONDO are separate.                                  |
| Copy research         | Execution-fit ranking, median holding time, activity frequency and 0/5/10/25 bps extra-cost stress. Current main DEX positions link to paper simulation.                                           |
| Wallet profile        | Current main DEX positions, equity, margin, entry, leverage, liquidation estimate, unrealized PnL; recent fills, reported fees, funding query, source portfolio history.                           |
| Watchlist             | Add address, edit label, remove, persist across restarts, export JSON.                                                                                                                             |
| Position radar        | Position-change observations; price, absolute funding and large-trade alert rules; read status; largest observed trades with buyer/seller links.                                                   |
| Markets               | Real main DEX markets and categories, hourly candles, selected builder DEX markets, observed taker activity, optional Bybit comparison.                                                            |
| Events & news         | Live BLS release calendar; verified 2026 FOMC meeting dates; Federal Reserve and Ethereum Foundation announcement feeds.                                                                           |
| Research              | Data-derived per-market brief with explicit scenarios, watchlist evidence, source links and Markdown export. No LLM spend.                                                                         |
| Paper trading         | $10,000 virtual account; open/close positions, one-time direction copy from a wallet, explicit margin/leverage, slippage and fees, persisted journal.                                              |
| Operations            | Collector pause/resume, source health, retention details, workspace export, full SQLite backup script.                                                                                             |

### How to use the smart-money workflow

1. Open the screener, select a preset and inspect quality, complete-trade counts and sample depth. Save useful filters and compare up to three wallets.
2. Open Coin inflow / outflow, select a window and drill into a coin to identify wallets opening or closing positions.
3. Inspect concentration. One large wallet can dominate a cohort’s apparent consensus.
4. Open a wallet profile. Check current leverage and position size relative to equity, then inspect recent executions.
5. Follow useful wallets. Their snapshots are checked about every minute; the automatic research sample refreshes about every five minutes.
6. Read the movement ledger. An exposure increase is different from a large position that has remained unchanged.
7. Compare market context and upcoming events. Use the paper journal to record a forward test.

Front-running detection is deferred until you supply wallets and methodology. Quality and copyability are disclosed heuristics, not calibrated predictions. An account may be hedged on another venue. Shared positioning does not establish coordination or market control.

## Data methodology and limits

- **Flow cohorts:** large wallets require a latest analysis within an hour and main equity ≥ $100K or covered gross positions ≥ $1M. Quality cohort requires a score ≥ 60 and 10 complete episodes. Historical flow views select the current cohort, not a historical point-in-time cohort.
- **Flow pace:** compares equal halves of the selected window using wallets with archived history reaching the start. Requires at least 70% wallet coverage and nonzero prior activity; missing history can still bias results.
- **Research sample:** up to 40 of the top 2,000 public leaderboard wallets, sorted by 30-day PnL, requiring positive 7D and 30D PnL, account equity ≥ $50,000 and 30D volume ≥ $100,000. This has selection and survivorship bias. It is not a complete Hyperliquid wallet index.
- **Positions:** main DEX snapshots plus separately labeled builder positions from the first three registered DEXs. Builder equity and spot balances are not summed. Main exposure/equity is not a complete risk ratio for unified or portfolio-margin accounts.
- **Freshness:** main market cache 30 seconds; wallet account cache 60 seconds; research cohort refresh about five minutes. Cohort exposure excludes snapshots older than ten minutes. Polling is best-effort, not a timing SLA.
- **Movement:** a difference in position quantity between snapshots. A reversal or round trip between snapshots can be missed. Signed notional change uses the observed mark, not an execution price. Initial snapshots never generate fake opening signals.
- **Trade stream:** Up to 12 high-volume main DEX markets and four classified RWA markets selected on connection. Deduplicated by `(block time, coin, trade ID)`. Latest 24 hours or 100,000 trades retained, whichever is shorter; cleanup runs every five minutes. Gaps are not backfilled. Taker buys/sells are not capital inflows/outflows.
- **Fills:** up to 2,000 most recent fills, cached five minutes. Fees include builder fees and are not counted twice. The UI distinguishes the fill sample from portfolio statistics; win rate uses complete reconstructed flat-to-flat position episodes, not individual fills.
- **Funding:** a separate 30-day request, first returned page, possibly truncated. Its coverage differs from the fills. Do not combine the two as a full realized return.
- **Calendar:** device-local display, US Eastern daylight-saving conversion. BLS refreshes six-hourly. FOMC dates are manually verified for 2026; the customary 2 pm ET statement time must be confirmed from the source. No live consensus/actual economic figures.
- **CEX:** Bybit public USDT perpetual last-price comparison may be blocked by region. It is compared with Hyperliquid’s USD mark, so the difference is indicative and not an executable arbitrage quote.
- **Paper:** 4.5 bps fee and 5 bps adverse slippage per side, 1–5× leverage, maximum 20 open positions, $10 minimum margin. Funding, liquidation, execution latency and order-book impact are not simulated. Positive unrealized PnL is not spendable. This is a journal, not a faithful execution simulator. No exchange orders are sent.
- **Storage:** SQLite WAL mode in `data/davira.sqlite`; 30-day alerts, 90-day equity history. Raw wallet fills retain 30 days with a global 250,000-row cap. Backups and local exports may contain wallet research; keep them private.

### Score and indexing methodology

- Quality requires five complete flat-to-flat episodes: 35% capped net profit factor, 25% profitable closing-day share, 25% closed-PnL drawdown control, 15% sample depth. Per-coin scores use the same calculation. These reflect the observed sample, not total account returns.
- Partial exits are grouped. Missing openings and position discontinuities are excluded from quality and win rate. Reversals split fees and notional between the old and new episode. Funding is excluded; nominal stablecoin quote units approximate USD.
- Copyability combines holding duration (35%), lower fill frequency (20%), PnL retained under an extra 10 bps per execution (30%) and sample depth (15%). Cost stress is arithmetic on observed episodes, not a follower backtest. No automated copy execution.
- Indexer processes one wallet about every 20 seconds, refreshing eligible analyses after 30 minutes. It archives each latest-2,000-fill response and exposes sample gaps. It does not backfill an entire wallet history.
- Automatic discovery is bounded to 80 indexed/queued addresses; the queue is capped at 100. Forty selected leaderboard wallets and the watchlist seed research; large observed RWA trades add candidates. Explicit analysis is available for other addresses. Public API budget and errors can slow collection.
- The initial 40-wallet analysis pass takes roughly 14 minutes plus source latency. Missing scores stay blank. Data persists across restarts; the collector must remain running for coverage to grow.

## Architecture

```text
Browser → Next.js :3000 → authenticated local API :8787
                              ├── shared public-source cache
                              ├── trade WebSocket + account polling
                              ├── deterministic analytics / paper engine
                              └── SQLite database on a persistent disk
```

- Frontend: Next.js, React, TypeScript, Recharts, Lucide; hand-built semantic controls.
- Engine: Node.js 24, native SQLite and WebSocket; Decimal.js for paper calculations.
- Public APIs: Hyperliquid, optional Bybit; BLS ICS and official RSS feeds.
- Engine token is server-only. The default listener is loopback. Host checks prevent accidental exposure and DNS rebinding. Mutations check Origin. A private remote pilot requires `APP_PASSWORD` (HTTP Basic user `davira`) and HTTPS from the host.
- This is a **single-user workspace**, not tenant-isolated SaaS. Basic auth is a pilot gate, not a customer account system.

## Tests and verification

```powershell
npm test
npm run build
npm audit
node scripts/backup.mjs
```

Automated tests use isolated temporary databases. They cover fill deduplication/fee accounting, baseline/change semantics, replayed stream events, alert cooldowns, paper balances/slippage/leverage limits, DST conversion, API authentication/validation and exports. They do not trade or modify your real workspace database.

To restore a backup, stop the app, preserve the existing database and its `-wal`/`-shm` companions, then point `DAVIRA_DB_PATH` at the backup copy. Never overwrite a running SQLite database. A JSON workspace export is a portable research export; it is not a full database backup and has no automatic import flow in V1.

## Deployment path — prepared, not deployed

The Dockerfile packages the frontend and engine together. `compose.yaml` retains SQLite in a named volume and binds the website to localhost. Set a strong `APP_PASSWORD` before running it. The container is intended for a private pilot behind HTTPS.

```powershell
# Set APP_PASSWORD through your shell or deployment secret store first.
docker compose up --build -d
```

The Docker definition is provided for portability; verify it on a Docker-equipped machine before hosting. Do not deploy this SQLite engine to an ephemeral filesystem without a persistent volume. Do not horizontally replicate the engine: it owns a single database and one collector.

### Cheapest practical sequence

1. **Now:** use the local machine. Hosting and API spend are zero; electricity/internet remain yours.
2. **Private beta:** use a free persistent container service only after verifying its current limits and acceptable-use terms. Northflank Sandbox was the preferred option in the researched deployment plan; Railway is credit/plan-limited, not guaranteed unlimited free hosting. Render’s free sleeping service is unsuitable for continuous observation.
3. **First paying users:** add real authentication, tenant ownership and authorization tests, payment webhooks, licensed-data checks, managed backups and monitoring. A small always-on server is often simpler than splitting a continuous collector across serverless services.
4. **Scale:** separate the collector from the API, move shared analytics to Postgres/time-series storage, add durable ingestion/replay and retain a tiered data history. Keep shared market collection independent of customer count.

See [the detailed product and deployment plan](docs/PRODUCT_AND_DEPLOYMENT_PLAN.md) for the broader roadmap and researched provider references. Provider offers change; re-check them when deployment is actually requested.

## Deliberately later than V1

Full-network historical wallet indexing; externally validated skill/risk scores and complete historical trade reconstruction; actual cross-chain capital flows; full builder-wallet/RWA aggregation; automated copy execution; calibrated forecasts; commercial news/social coverage; customer accounts, billing and public production deployment. These are not silently simulated in the current product.


### Daily wallet evidence (September 2026)

Daily discovery freezes the first fresh leaderboard observation per UTC date. Rank is based on reported 30D PnL, with deterministic address ordering for ties. It compares only consecutive UTC dates. New entrants and exits refer to this bounded leaderboard universe, not first-ever trades or wallets becoming inactive. Daily snapshots do not expire automatically; monitor storage as history grows. Source timestamps describe local retrieval time, not a guaranteed upstream publication time.

The screener includes rank risers, new entrants, max equity, minimum episode win rate, last-execution recency and sample-check filters. Profiles show the last 14 captured daily observations available in the database, immutable reported PnL, source time, execution freshness, response cap and continuity checks. Missing leaderboard metrics remain null. Sample checks are not proof of complete history or a calibrated confidence score.

Copy candidates additionally require fresh execution evidence, zero detected position gaps and a verified latest response below the 2,000-fill cap. The pre-move research column is reserved and has no score until a methodology is supplied and validated. External wallet labels and commercial Arkham/Binance ingestion are not implemented in this release.

### Watchlist activity

The watchlist combines followed-wallet positions, fresh long/short exposure, pending main-DEX and spot orders, and persisted in-app order/fill/position alerts. Select one wallet or view the full list. Builder positions retain their own snapshot timestamps; stale positions are excluded from totals. Monitoring starts at the first activity check, avoiding a flood of historical order alerts.

The collector rotates one wallet every 15 seconds, with a minimum 30-second interval per wallet. Rate limits and source caps can delay or omit events. The UI refreshes every 10 seconds and reports source failures. Alerts require the local collector to remain running; no browser push or off-device delivery is configured. Background wallet indexing yields request headroom to watchlist monitoring.

### Coin positioning, behaviour and cohort research

Select a coin on Coin inflow / outflow to open its positioning brief. This uses all indexed wallets independently of the flow-table cohort selector. It splits long entries/exits and short entries/covers, highlights concentration, and compares a later fresh position snapshot with the last observed execution direction. Same-direction snapshots cannot prove continuous holding.

Six overlapping cohorts compare signed position-size votes: coin specialists, consistent traders, high-equity wallets, short-duration traders, longer-duration traders and the watchlist. Each address gets one vote; at least three addresses and a 34% imbalance are required for a directional reading. Current cohort membership is used, not historical membership. Ownership independence and predictive accuracy are not established.

Behaviour research groups partial fills by order ID. Size flags require a 3x increase over the prior-order median, at least 10 baseline orders on three days, and fresh uncapped analysis without detected gaps. The baseline excludes the selected window and uses retained history of up to 30 days. Reversals and repeated opening/closing orders are descriptive events. Leverage-change and first-ever-coin-entry analysis are withheld without supporting history. Every view exposes its evidence and methodology.
