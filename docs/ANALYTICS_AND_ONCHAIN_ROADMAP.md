# daVIRA: intelligence product and engineering roadmap

**Team handoff · 24 September 2026 · Planning document, not a shipped-feature announcement**

## 1. Executive direction

Build a research platform that answers five questions clearly:

1. Which historically capable wallets are changing exposure in this particular asset?
2. Is that change broad, persistent and unusual—or one wallet dominating a small sample?
3. Does price, liquidity and derivatives positioning support or contradict that observation?
4. What would invalidate the thesis, and can a smaller trader execute it at acceptable cost?
5. What evidence supports every conclusion, and how complete is that evidence?

**Initial customer:** active crypto traders and small research/prop teams studying Hyperliquid. Expand into selected on-chain spot activity after the core evidence pipeline is reliable.

**Product promise:** reduce research time and expose misleading signals through source-linked analysis. Do not promise profitable trades, complete market coverage or knowledge of trader intent.

**Commercial hypothesis:** $10/month target for the initial paid research product, subject to customer validation and measured serving costs. Older repository documents still mention $5; that is historical, not the current target. Billing is not assumed implemented.

**Company sequence:** (1) intelligence software, (2) proprietary research/trading, (3) market making. These are separate businesses with separate capital, operating and governance requirements. Infrastructure-as-a-service is outside the current scope. This roadmap concerns phase 1; it does not change the pitch deck.

### Recommended next release

Ship a **Coin Intelligence Desk** combining:

- Observable positioning, separately from trade readiness.
- Specialist records and cohort disagreement.
- Concentration, persistence and unusual behavior.
- Price/open-interest/funding context.
- A personalized watchlist brief and actionable research alerts.
- Explicit data coverage and a timestamped evidence trail.

Do not start by adding another general-purpose leaderboard or a chatbot over incomplete numbers.

## 2. Status and scope of this document

This inventory was checked against the repository's README, engine modules, current eligibility policy and existing product documents. It is a code-level review, not an independent audit of production reliability or analytical correctness. The main development task is active; some files may change after this document is written.

Labels used below:

- **Existing:** code supports the capability; coverage and operational limits still apply.
- **Improve:** extend or correct an existing capability rather than rebuilding it.
- **New:** proposed work requiring implementation and validation.
- **Research gate:** do not publish as an operational signal until its methodology is validated.

At handoff, working-tree changes include market-history and positioning-brief modules. Treat those as **in progress**, inspect their final state, and coordinate before implementing overlapping work. This document does not certify those changes as shipped.

## 3. What exists, and what to improve

| Area | Existing foundation | Next improvement |
|---|---|---|
| Wallet discovery | Leaderboard plus indexed wallets, daily rank snapshots, presets, lookup, filters, saved screens and comparisons | Coverage-aware ranking; explain eligibility; separate funded, inactive, unindexed and stale wallets |
| Wallet profiles | Covered positions, equity, fills, source portfolio performance, reconstructed trade episodes and coin statistics | Reconciled performance panels, regime history, observable style changes and source-by-source freshness |
| Coin specialists | Per-token episode statistics and specialization views | Separate turnover concentration from demonstrated token skill; show coin name, sample size, net PnL, costs and historical windows together |
| Position flows | Four opening/closing components and cohort filters | Persistent vs transient exposure, point-in-time cohort comparisons, uncertainty and market-context overlay |
| Flow analytics | Breadth, dominant activity, largest-contributor sensitivity and baseline-gated activity pace | Present these on the main decision screen; make counter-evidence equally visible |
| Coin research | Cohort disagreement, reversals, repeated entries/exits and unusual executed-order size | Better historical baselines, regime-relative anomalies and explicit data readiness |
| Market summary | Directional score and strict evidence gates | Separate observed behavior, evidence quality and setup eligibility; avoid a page consisting only of “Wait” |
| Trade setups | Gated directional scenarios, structural stops, ATR buffer, R targets and local risk sizing | Expiring versioned scenarios, forward evaluation and execution feasibility; retain independent user risk |
| Copy research | Candidate policy, style fit, observed extra-cost stress, paper workflow | Explain exclusions; add delay-aware simulation and drawdown-aware evaluation before live execution |
| Watchlist | Combined positions, orders, fills and persisted in-app activity alerts | Narrative digest, meaningful-change filters, grouped alerts, event latency and delivery status |
| RWA | Instrument classification and selected builder-DEX coverage | Coverage by venue, session-aware analysis, liquidity and concentration comparisons |
| Market context | Quotes, candles, funding, open interest and optional CEX comparison | Durable snapshots and comparable time-window changes; price divergence without false arbitrage claims |
| Daily wallet discovery | Frozen daily leaderboard observations and rank comparisons | Point-in-time membership, newcomers vs re-entrants, persistent skill vs transient PnL |
| Operations | Local SQLite, collector health, cache, backups and pause/resume | Queue observability, replay, gap repair, budget scheduling and restore testing |
| AI and multichain | Future direction | Typed analytics tools first; narrow chain coverage before broad indexing |

### Important existing limitations

- This is a persistent local, single-workspace application—not yet a tenant-isolated hosted SaaS.
- Wallet executions are a bounded indexed sample, not every Hyperliquid wallet or a lifetime trading ledger.
- Current cohort selection can bias historical displays toward today's successful wallets.
- Partial episodes, missing openings and capped history reduce valid trade samples.
- Position notional, collateral transfers, spot token transfers and venue volume are different quantities.
- Selected builder venues do not establish complete account-level coverage.
- Closed-trade PnL drawdown is not full mark-to-market equity drawdown.
- Current copy research and risk scenarios are not autonomous order execution.
- Missing data must remain unknown; zero is a measured value, not an error fallback.

## 4. First fix: evidence before more signals

The earlier “all coins say Wait” diagnosis found very few fresh analyses and very few token records meeting the specialist thresholds. Those counts were a temporary local observation, not a permanent property of the market. A market price move alone cannot make missing wallet evidence valid.

### Replace the single-answer model with four layers

| Layer | Example display | Meaning |
|---|---|---|
| Observation | “Short covering dominates the observed buys” | Descriptive execution evidence |
| Interpretation | “Buy pressure relies heavily on closing shorts” | Deterministic interpretation with supporting figures |
| Evidence | “22 wallets; 6 fresh; 0 qualified token specialists” | What the system can and cannot establish |
| Trade readiness | “Insufficient specialist history” | Why a research setup is unavailable |

Use specific states: **No coverage**, **Stale coverage**, **Observed positioning**, **Conflicting evidence**, **Setup eligible**. Keep “Wait” as an optional user-facing summary of a blocked setup, not the only insight on the page.

### Non-negotiable engineering rules

1. Freshness uses the underlying source observation time, not the time a calculation was rerun.
2. A successful cached response does not mean fresh source data.
3. Future timestamps, invalid numbers and failed requests cannot qualify evidence.
4. Completeness is evaluated by source, wallet, asset and window. An uncapped response alone does not prove complete historical coverage.
5. A historical specialist can remain a historical specialist while being ineligible for a current signal because its current activity is stale.
6. Do not lower thresholds just to populate a board. Publish the rejection reasons and improve collection.
7. Display one address as one address—not one independently verified person or institution.

## 5. Priority A: make the Hyperliquid product substantially better

### A1. Evidence and coverage center — Improve, P0

**Question:** Can I trust the observation on this page?

Show indexed/fresh wallets, last successful source fetch, queue age, response caps, continuity gaps, history span, failed sources and upcoming retry. Add a drill-down from every unavailable metric to its exact reason.

Implement source-level timestamps and coverage records. Separate ingestion lag, calculation lag and browser refresh lag. Use a weighted request scheduler with reserved capacity for followed wallets and shared market context, plus an aging mechanism so research jobs do not starve.

**Acceptance:** simulated timeouts never turn into zero balances; stale data is visibly stale; a refresh of cached data does not reset freshness; restarting resumes jobs without double counting; queue diagnostics explain delayed wallets.

### A2. Coin positioning desk — Improve, P0

For each coin expose:

- Long openings, long closes, short openings and short closes.
- Net position expansion/contraction, distinct from buy/sell pressure.
- Wallet breadth and specialist breadth, including neutral wallets.
- Largest and top-five contribution shares.
- Direction after removing the largest contributor.
- Raw vs equal-wallet vs specialist-weighted agreement.
- Observed behavior and setup readiness as separate columns.

**Implementation:** reuse existing flow and coin-research modules; do not duplicate their arithmetic in React. Use a canonical backend response and matching definitions across Summary, Flows and Coin Detail.

**Acceptance:** short covering cannot be mislabeled new long exposure; both sides of a reversal reconcile; overlapping cohorts are never summed as distinct populations; every total drills down to contributing executions/wallets.

### A3. Persistent conviction — New, P1

**Question:** Did a wallet retain or immediately reverse its exposure?

Record exposure paths and follow observable additions, reductions and exits across subsequent snapshots. Show 1H/6H/24H retention and time since last observed direction change only when history supports those intervals.

Use baseline position size plus chronological fills and reconciliation snapshots. A matching direction at two endpoints is only **same direction at both observations**, not proof of continuous holding. Gaps reset continuity claims.

**Acceptance:** a full exit and re-entry between endpoints is not continuous holding; deposits do not inflate conviction; every persistence statistic exposes its observation window.

### A4. Token specialist dossier — Improve, P1

**Question:** Is this wallet good at BTC specifically, or merely a large BTC trader?

Display coin, turnover share, complete episodes, profitable days, expectancy, payoff ratio, profit factor, net realized result, costs, holding-time distribution, maximum observed adverse excursion and sample depth where computable.

Separate these badges:

- **Concentrated trader:** large share of turnover in one asset.
- **Observed profitable specialist:** positive token record passing declared sample gates.
- **Current participant:** recent verified activity in that asset.

Add 7D/30D/90D views only where retained history supports them. “All available” must show its actual first and last date. Do not relabel 30 days of fills as lifetime skill.

**Acceptance:** a loss-making concentrated wallet cannot receive a skill badge merely because it specializes; partial episodes do not count as independent wins; selecting a coin updates both ranks and supporting figures.

### A5. Cohort disagreement and rotation — Improve, P1

Compare current large wallets, historically qualified specialists, recently profitable wallets and the user's watchlist. Show overlap counts. Later add frozen historical cohort versions for unbiased comparisons.

Rotation requires matched exposure observations or executions over comparable periods. Show “covered equity derivatives exposure increased while covered crypto exposure decreased,” without claiming money moved between the two unless transfer evidence establishes that.

**Acceptance:** cohort totals expose overlap; adding a wallet to today's watchlist does not rewrite an old saved cohort; a change in asset price is separated from a change in position quantity.

### A6. Derivatives context and divergence — New/Improve, P1

Archive mark price, underlying OI units, funding and volume with source times. Derive 1H/6H/24H changes only after valid baselines exist.

Show price change alongside OI change and specialist positioning. Distinguish:

- Price up + OI up: rising price with expanding outstanding contracts.
- Price down + OI up: falling price with expanding outstanding contracts.
- Price up + OI down: rising price with contracting outstanding contracts.
- Price down + OI down: falling price with contracting outstanding contracts.

These combinations do **not** identify the initiating side by themselves. OI has a long and a short side; use actual observed execution evidence to discuss closing or opening behavior.

Normalize OI consistently: dollar OI can rise simply because price rises. Compare contract/base units where contract semantics permit; preserve venue-specific units.

Funding context should show current rate, sign, interval and historical percentile only after sufficient observations. A high rate indicates expensive positioning, not an assured reversal.

**Acceptance:** a price doubling with unchanged base OI produces 0% base-OI change; missing baselines show “Collecting history”; divergence calculations use aligned time windows; stale CEX quotes are excluded.

### A7. Explainable anomaly radar — Improve, P1

Extend existing unusual-order/reversal detection with wallet-relative changes in trade size, leverage, execution frequency, instrument selection and direction.

Use robust past-only baselines, such as median and median absolute deviation, with minimum sample and active-day requirements. Exclude the event being assessed from its own baseline. Define a fallback when dispersion is zero. Group partial fills by order rather than treating each fill as a fresh decision.

**Acceptance:** a large wallet trading its normal size is not automatically anomalous; first observations say “Baseline unavailable”; unrelated repeated events do not flood alerts; method version is stored with the anomaly.

### A8. Watchlist command center — Improve, P1

Show “what changed since your last visit,” combined directional exposure, largest changes, pending order lifecycle, recent executions, concentration and covered liquidation proximity.

Alert types: new order, fill, position opened, material increase/reduction, reversal, exit, unusual activity, and evidence becoming stale. Distinguish new orders from executions and canceled orders from exits.

Each alert contains event time, detection time, wallet, coin, before/after state, trigger rule, source link and deduplication key. Group bursts; allow thresholds and quiet hours. Add external delivery only with per-user opt-in and delivery/retry tracking.

**Acceptance:** the first snapshot does not trigger historical “new position” alerts; duplicate stream/replay events yield one logical notification; restart and reconnect gaps are visible; a canceled order does not imply a trade happened.

### A9. Copy suitability lab — Improve, P1/P2

Keep candidate eligibility separate from ranking. Explain missing 30D PnL, unfunded covered venues, stale data, poor continuity and insufficient history.

Add a historical follower simulation with configurable observation delay, fixed user risk, fees, slippage, minimum order sizes, partial fills and funding where supported. Never copy the leader's account leverage blindly. Separate arithmetic cost stress from an execution simulation.

Report return distribution, drawdown, turnover, time in market, loss streaks, rejected entries and cost sensitivity. Preserve realistic limit-order behavior: seeing a limit price is not proof a follower would fill.

**Acceptance:** the follower cannot trade before receiving an event; uses only then-known wallet eligibility; slippage/cost increases cannot improve otherwise identical fills; missing order-book history produces a labeled approximation.

### A10. Forward research journal — New, P1

Freeze every promoted research observation with model version, cohort membership, raw inputs, evidence, source timestamps and expiration. Evaluate subsequent 1H/6H/24H movement, favorable/adverse excursion and cost-adjusted scenarios.

Record observations even when the later outcome is bad. Compare against simple price-momentum, random-timestamp and broad-market baselines. Report coverage, sample size, regime and dependence between repeated signals. Use walk-forward periods and confidence intervals; do not select the best threshold using the final test period.

**Acceptance:** a previously saved signal cannot change when today's wallet score changes; failed signals remain visible; missing future prices are censored, not wins or zeros; benchmark methodology is reproducible.

## 6. Priority B: genuine on-chain intelligence

### Start narrow

Choose one additional chain using customer demand, overlap with tracked wallets, decoder availability and measured RPC cost. An EVM chain may allow reuse of address tooling, but an identical address is not evidence of an economic strategy spanning venues. HyperCore activity and HyperEVM activity require different data adapters.

Start with an explicitly bounded watchlist and a small contract allowlist. Full-chain indexing is a separate engineering and cost commitment.

| Feature | Data and method | Useful output | Release condition |
|---|---|---|---|
| Wallet transaction timeline | Finalized transactions, receipts/logs, decoded contract actions | Transfers, swaps, lending, liquidity changes in one chronological record | Show undecoded transactions and decoding coverage |
| Spot cost basis and realized PnL | Token quantities, swaps, transfers, prices, fees; declared inventory method | Profitability by token and realized/unrealized separation | Imported inventory cost remains unknown unless verified |
| Token holder change | Periodic balances for defined holder universe | Which tracked cohorts accumulate/distribute | Universe and denominator shown; no “all holders” claim for a sample |
| Exchange transfer monitor | Transfers plus licensed/verified service labels | Deposits/withdrawals to known service addresses | Transfer direction is not labeled buying/selling intent |
| Stablecoin liquidity monitor | Selected token transfer logs, mint/burn events and service movements | Changes in covered liquidity distribution | Treasury/internal movements and bridges separately classified |
| Bridge flow map | Protocol-specific source/destination message matching | Capital moving between supported chains | Match by protocol evidence; unmatched legs retained separately |
| Counterparty graph | Transactions, contract roles and attributed addresses | Recurring counterparties and routes | Edges show transaction evidence; graph proximity is not identity |
| DEX execution quality | Decoded swaps, pools, reserves/ticks and quotes | Realized slippage, route cost and pool depth | Correct token decimals, fee accounting and block context |
| Liquidity fragility | LP changes, depth near market, concentration | Where available exit liquidity is deteriorating | Reserve value not confused with executable depth |
| Lending risk | Protocol positions, oracle prices, collateral parameters | Covered collateral stress and liquidation proximity | Protocol-version-specific formulas and fresh prices |
| Supply/unlock context | Verified vesting contracts and disclosed schedules | Upcoming observable supply changes | Separate scheduled unlock from tokens actually transferred/sold |
| New holder cohorts | Point-in-time balances and historical activity | New tracked entrants and retained holders | “New to our observation” distinct from first-ever holder |

### Transfer accounting requirements

- Canonical identity: chain ID + asset contract/mint + token standard; never symbol alone.
- Distinguish native currency, wrapped assets, bridged representations and derivatives.
- Preserve raw integer quantities; apply verified decimals for display/calculation.
- Failed transactions do not produce successful transfer balances; transaction fees remain separate.
- Handle rebasing and fee-on-transfer assets through explicit adapters or mark unsupported.
- Use block hashes, transaction hashes and log/instruction indices for idempotency.
- Model chain finality and reorg rollback. Do not silently retain orphaned transactions as final.
- Internal native transfers may require traces/indexing beyond ordinary transaction receipts. Do not claim complete flows from token logs alone.
- Address transaction discovery on EVM is not a single generic “get every wallet transaction” RPC call; budget for block/log scans or an indexer.
- For Solana, account/token-account discovery and program decoding are separate work; owner-address signatures alone may not provide a complete token activity ledger.

## 7. Differentiated research: valuable, but validate first

### Pre-move wallet research — Research gate

Use the product label **Pre-move positioning research**. Entering before a price move does not establish front-running, insider knowledge or manipulation.

The founder's methodology remains pending. Reserve the UI/data contract; do not invent a production score on their behalf.

Research protocol to agree before implementation:

1. Define the move using fixed horizon and volatility-adjusted threshold.
2. Define an eligible entry, minimum exposure, liquidity and maximum lead time.
3. Reconstruct what was observable at entry time, including realistic detection delay.
4. Compare with matched random entries and simple market-trend baselines.
5. Include failed entries, inactive wallets and all tested assets—not only winners.
6. Require recurrence across independent periods, with multiple-testing control.
7. Publish sample size, lead-time distribution, adverse excursion and uncertainty.

**Release gate:** frozen method, leak-free historical evaluation, prospective observations, reviewed wording and evidence links. Historical association is not a forecast guarantee.

### Wallet continuity research — Research gate

Detect an inactive wallet transferring funds to another address and show a **possible continuity lead** with the exact transaction trail. Potential evidence: transfer size/time, subsequent observed trading, recurring counterparties and behavior similarity.

Do not automatically merge ownership. Exchange withdrawals, service wallets, shared funding, bridges and dust transfers create misleading associations. A transfer proves a transfer, not that the trader changed wallets.

Use statuses: transaction link observed / behavioral similarity / externally attributed / rejected hypothesis. Keep reason codes, provenance and analyst review. Suggested follow must be reversible; preserve both wallets' independent histories.

### Additional research backlog

- Skill by volatility/trend regime rather than one global wallet rank.
- Persistence of token specialization over rolling windows.
- Similarity clusters to reveal potentially redundant wallet votes, without asserting shared ownership.
- Specialist vs price divergence followed by forward outcomes.
- Cross-venue basis and funding dispersion with realistic quote synchronization.
- Reaction to CPI/FOMC or protocol announcements, using fixed event windows and verified times.
- Covered liquidation proximity maps; label estimates and omitted venues. Do not market a complete market liquidation map from a wallet sample.

## 8. Scoring architecture

Avoid one mysterious “smart money score.” Maintain separate dimensions with clear denominators.

| Dimension | Measures | Must not imply |
|---|---|---|
| Historical wallet quality | Observed net performance, consistency, risk and sample depth | Future profitability |
| Token expertise | Same measures for one asset | Skill inferred only from trading volume |
| Evidence quality | Freshness, history continuity, sample coverage and independence limits | Calibrated probability of correctness |
| Current positioning | Direction and opening/closing behavior | A personal buy/sell instruction |
| Copy feasibility | Delay, liquidity, costs and style fit | Guaranteed replication of leader PnL |
| Setup eligibility | Evidence gates plus price/risk constraints | A score high enough to override missing data |

### Useful transparent calculations

For a covered coin/window, let LO = long openings, LC = long closes, SO = short openings, SC = short closes; all use matched notional conventions.

```text
Opening balance = (LO - SO) / (LO + SO)
Execution balance = (LO + SC - SO - LC) / (LO + SC + SO + LC)
Position expansion = LO + SO - LC - SC
New-long share of buys = LO / (LO + SC)
New-short share of sells = SO / (SO + LC)
Wallet breadth = positive net-size-change wallets / nonzero-change wallets
Activity concentration HHI = sum(wallet activity share squared)
Effective activity contributors = 1 / HHI
```

Zero denominator returns null. Effective contributors measures activity concentration, not independent owners. Summed notional may include both cohort counterparties and is not exchange volume.

The current direction score mixes opening balance, specialist vote and execution balance. Keep its method version; evaluate alternatives in shadow mode before changing production thresholds. Missing specialist votes must be exposed, not described as confirmed neutral specialists.

### Proposed quality-model evolution

Preserve existing scores as version 1. For version 2, investigate benchmark-adjusted performance, drawdown from reconciled equity, downside dispersion, cost resilience and persistence across periods. Normalize for sample uncertainty; avoid a perfect score after a few lucky trades. Use shrinkage toward a cohort baseline only with a documented estimator and validation.

Every score response should include components, eligibility, rejected reasons, window, sample counts, source timestamps and model version. Do not display a percentage “chance of success” until calibration on held-out outcomes supports that interpretation.

## 9. Data strategy, competitors and sources

### Learn from competitors without depending on their UI

- Nansen's documented product surface combines wallet cohorts, holdings and transaction/flow analysis. Use this as a workflow reference; do not assume access to its labels or reproduce its proprietary definitions. [Nansen Smart Money API](https://docs.nansen.ai/api/smart-money), [Netflows](https://docs.nansen.ai/api/smart-money/netflows).
- Arkham offers entity and fund-flow intelligence through an API. Evaluate licensing and access before integration; a publicly viewable wallet label is not automatically an open commercial dataset. [Arkham Intel API](https://info.arkm.com/arkham-intel-api), [API announcement](https://info.arkm.com/announcements/the-new-arkham-api).
- Binance/Hyperdash/Hyperclone can inform interaction design. Treat commercial ingestion, redistribution rights and stable APIs as unverified until documented. Do not build the collector around scraping a competitor's visual interface.

The defensible asset is a well-maintained point-in-time evidence archive, tested analytics and a useful customer workflow. More cards or a copied label list alone do not create that advantage.

### Source implementation matrix

| Source | Initial use | Cost/control strategy | Important boundary |
|---|---|---|---|
| Hyperliquid public info | Accounts, fills, markets, portfolio data | Shared cache, weighted scheduler, bounded repair jobs | Endpoint caps and request weights limit history/scale |
| Hyperliquid WebSocket | Public trades and supported watched-account events | Bounded subscriptions, reconnect/reconcile | Streaming cannot repair every missed historical event |
| EVM JSON-RPC | Selected logs, receipts and balances | Narrow contracts/wallets, adaptive block ranges | Provider limits and historic availability vary |
| Solana RPC | Selected account histories/transactions | Add only after a dedicated decoder milestone | Token accounts, program versions and provider retention matter |
| Nansen/Arkham | Optional licensed labels/enrichment | Provider adapter and disabled-by-default capability | Credentials, contracts and redistribution terms required |
| Official protocol disclosures | Contract metadata and event context | Human-reviewed registry, versioned sources | Announcements are not executed on-chain events |

Hyperliquid documents bounded fill retrieval and weighted request limits. Implement pagination where supported, record truncation and stop repair when the source cannot provide older data; do not promise unlimited backfill. [Info endpoint](https://hyperliquid.gitbook.io/Hyperliquid-docs/for-developers/api/info-endpoint), [Rate limits](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits).

Use documented event subscriptions, then reconcile after interruption. [WebSocket subscriptions](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions).

EVM adapters should use documented RPC semantics; Solana requires its own transaction/account model. [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/), [Solana Foundation RPC reference](https://github.com/solana-foundation/solana-com/blob/main/apps/docs/content/docs/en/rpc/http/index.mdx).

Sources checked on 24 September 2026. Recheck endpoint contracts and commercial terms before implementation. No paid provider purchase is authorized by this document.

## 10. Proposed engineering design

### Keep the existing stack for the bounded pilot

```text
Source adapters
  → rate-budget scheduler + reconnect/reconciliation
  → raw event archive + checkpoints + coverage
  → normalized executions / positions / transfers / market snapshots
  → deterministic analytics + point-in-time cohorts
  → versioned insights + alert evaluation + forward outcomes
  → authenticated API
  → coin desk / wallets / watchlist / reports / research assistant
```

Continue Next.js + Node + persistent SQLite for a measured single-instance pilot. Do not introduce Kafka or a fleet of services merely for architectural appearance. Move to a shared database/job system when measured write concurrency, recovery or customer isolation requirements justify it.

### Proposed tables / records

| Record | Core fields and constraints |
|---|---|
| source_checkpoints | source, partition, cursor, event watermark, fetched_at, retry state, gap status |
| coverage_windows | wallet/asset/source, start/end, coverage state, cap/gap reason, checked_at |
| market_snapshots | venue, asset ID, source time, price, base OI, USD OI, funding, interval; unique observation key |
| normalized_events | source event ID, chain/venue, asset, address, action, raw units, event/ingest times, finality, raw reference |
| position_snapshots | address, venue, asset, quantity, price/equity scope, source time, quality flags |
| cohort_versions / members | cohort definition version, effective time, membership and qualifying evidence |
| insight_snapshots | insight ID, method version, input references, generated/as-of times, window, evidence, expiry |
| outcome_observations | insight ID, horizon, benchmark, cost assumptions, realized evaluation time, missing/censored reason |
| entity_attributions | chain/address, label, provider, provenance, confidence class, license, validity, review state |
| alert_subscriptions / deliveries | user ownership, rule version, idempotency key, event/detection/send time, delivery status |

Reuse compatible existing tables; design migrations instead of creating competing storage for the same fact. Raw payload retention needs a byte budget, compression policy and safe expiry. Keep enough lineage to reproduce published analytics.

### API conventions

Every analytical response should expose `asOf`, `windowStart`, `windowEnd`, `methodVersion`, `coverage`, `warnings`, `sourceRefs` and explicit nullable values. Proposed resource families:

- Coin evidence and behavior summary.
- Wallet/token performance and eligibility explanation.
- Cohort comparison with versioned membership.
- Watchlist digest and alert history.
- Market-context history with valid baseline indicators.
- Forward observation/outcome report.

These are proposed contracts, not claims that endpoints already exist. Keep calculations in tested engine modules; React renders results rather than independently recomputing financial metrics.

## 11. UI structure

### Primary navigation

1. **Overview:** market context, meaningful changes and coverage health.
2. **Coin Intelligence:** asset-specific positioning, specialists and counter-evidence.
3. **Wallet Discovery:** ranked research universes and qualification controls.
4. **Watchlist:** personalized combined exposure and change feed.
5. **Research Lab:** copy simulations, scenario journal and forward validation.
6. **On-chain Explorer:** only supported chains/protocols, introduced with phase B.

Keep methodology and data health accessible throughout. Avoid several pages offering slightly different versions of the same score.

### Coin detail, in reading order

1. Asset identity, venue and last update.
2. One-sentence observed behavior with evidence grade.
3. Four flow components and timeframe selector.
4. Specialist/cohort agreement and concentration sensitivity.
5. Price/OI/funding and comparable historical context.
6. Wallet contributors with token records and current exposure.
7. Counter-evidence and missing information.
8. Optional eligible research scenario with separate user-risk inputs.
9. Alert/save/export actions and reproducible methodology.

Example wording: “Observed buy activity is mainly short exits. New-long participation is limited. The sample is concentrated in three addresses. No qualified directional setup.” This remains useful without inventing a trade recommendation.

Use restrained motion, dense readable tables, clear units, keyboard navigation, responsive column priorities, accessible contrast and reduced-motion support. The established brand should stay consistent; this roadmap does not call for another theme rebuild.

## 12. LLM research assistant

Add after canonical analytics and provenance are stable. Start with read-only prompts such as:

- “Why did ETH positioning change today?”
- “Compare these wallets on SOL, including sample limitations.”
- “Which followed wallets reversed their positions?”
- “Explain why this copy candidate failed eligibility.”

Implement typed tools over vetted analytics, not unconstrained SQL or raw internet claims. Numerical answers come from deterministic services. The model must cite the time window, wallet/coin source links and missing information. Untrusted token names, metadata and news text must never be treated as tool instructions.

Use deterministic digests by default; invoke the LLM on explicit requests, cache reusable explanations and enforce per-user token/cost limits. Do not allow it to invent unavailable PnL, infer private identities, override gates or place orders. Test adversarial prompts, unsupported questions and conflicting data.

## 13. Execution backlog and dependencies

Effort bands are planning estimates for someone familiar with the code: S = 1–2 engineering days, M = 3–5, L = 1–2 weeks, XL = multiple weeks/research-dependent. Include review time; these are not delivery promises. Historical evidence needs elapsed collection time regardless of coding speed.

| ID | Deliverable | Priority | Depends on | Effort | Completion evidence |
|---|---|---|---|---|---|
| D01 | Audit current contracts and consolidate metric definitions | P0 | None | S | Inventory and consistency fixtures |
| D02 | Source freshness, coverage states and queue diagnostics | P0 | D01 | M | Failure/cache/restart tests and health UI |
| D03 | Summary separates behavior from setup eligibility | P0 | D01, D02 | M | Long/short/covering/missing-data UI cases |
| D04 | Durable market snapshots and OI/funding baselines | P1 | D02 | M | Unit-normalization tests; warmup UI |
| D05 | Budget scheduler and bounded history repair | P1 | D02 | L | Quota simulation, cursor replay and starvation tests |
| D06 | Specialist dossiers and explicit exclusion reasons | P1 | D02, D05 | M | Coin concentration vs skill cases |
| D07 | Frozen cohorts and immutable insight snapshots | P1 | D01, D02 | L | No future-data leakage tests |
| D08 | Persistence, concentration and disagreement views | P1 | D03, D07 | M | Exit/re-entry and overlap tests |
| D09 | Watchlist digest and material-change alert rules | P1 | D02 | M | Event deduplication and reconnect tests |
| D10 | Forward outcome dashboard and benchmarks | P1 | D04, D07 | L | Reproducible outcomes including failures |
| D11 | Cost/delay-aware copy simulation | P2 | D05, D07, D10 | L | No-lookahead and cost sensitivity tests |
| D12 | Hosted pilot: isolation, auth, backups and observability | P1 before customers | D02 | L | Tenant authorization and restore tests |
| D13 | One-chain transaction/transfer adapter | P2 | D02, D05, source decision | XL | Reorg, decimals and duplicate-event tests |
| D14 | Spot inventory and counterparties | P2 | D13 | L | Unknown-cost and service-address cases |
| D15 | Bridge/exchange/liquidity intelligence | P2 | D13, D14, labels | XL | Matched/unmatched flows and provenance |
| D16 | Read-only LLM research assistant | P2 | D03, D06, D07 | M/L | Grounding, access and cost evaluations |
| D17 | Pre-move research prototype | Research | Founder method, D07, D10 | XL | Preregistered method and prospective test |
| D18 | Wallet continuity leads | Research | D13, D14 | XL | False-match evaluation and review workflow |

### Suggested release sequence

**Release 1 — Trusted interpretation:** D01–D04, D09 and coverage-aware existing profiles. Coordinate with current in-progress summary changes rather than replacing them.

**Release 2 — Evidence archive:** D05–D08 and D10. Improve historical depth, persistent observations and measurable research quality.

**Release 3 — Private customer pilot:** D12 plus the smallest useful D11 scope. Collect feedback on actual research tasks and measure serving cost.

**Release 4 — Narrow on-chain expansion:** D13–D15 for one selected chain and protocol set. Add D16 once the underlying tools are dependable.

**Research lane:** D17–D18 remain separately labeled until validated. Do not block the reliable core product waiting for speculative features.

## 14. Test and release contract

Use isolated fixture databases; never reset the developer's live SQLite database to run tests.

Required analytical cases:

- Partial closes, reversals, duplicate fills, missing openings and fee allocation.
- Flat round trips vs retained exposure; price changes vs quantity changes.
- Stale, capped, missing, future-dated and partially failed source data.
- Current vs historical cohort membership and overlapping cohorts.
- Funding, deposits and withdrawals kept separate from trade PnL.
- Zero denominators and large/raw decimal quantities.
- OI unit normalization, misaligned baselines and insufficient snapshot history.
- Reconnect gaps, event replays and alert deduplication.
- Source timestamps vs calculation timestamps.
- Tenant access, exports and notification ownership before hosted multi-user use.

For each feature: define the input contract, pure calculation, fixture tests, API contract, empty/loading/stale/error UI and methodology before calling it complete. Run the relevant automated tests, production build and browser checks in both themes and narrow layouts. Record which checks ran and what remains unverified.

## 15. Cost and operating plan

- Share collection and analytical caches across users. Page views should not each trigger a full wallet fetch.
- Prioritize a measured wallet universe with explicit refresh tiers; widen it only when budget and freshness remain acceptable.
- Separate live monitoring from historical repair. Repair must yield to live coverage without being permanently starved.
- Track source request weight, response size, events/day, storage growth, job lag and cost per active user.
- Keep an always-on collector and persistent disk for meaningful history. A sleeping or ephemeral service loses coverage even if the frontend remains accessible.
- Free hosting/RPC offers are experiments, not permanent capacity guarantees. Recheck provider terms when choosing deployment.
- Maintain off-host backups and actually test a restore. SQLite WAL files and live backup semantics must be handled correctly.
- Avoid multi-instance collectors writing to independent SQLite copies. A later shared database migration needs an explicit cutover/reconciliation plan.
- Paid enrichments must remain optional behind adapters; the core product must honestly describe what remains available without them.

Do not buy vendors or promise infrastructure spend based solely on this roadmap. Measure the bounded pilot first.

## 16. What to demonstrate to customers and potential investors

Feature count alone does not establish fundability. Show evidence of a repeatable product advantage:

1. A user can identify a meaningful wallet-driven change and inspect its source in minutes.
2. The product helps reject a misleading aggregate, such as one dominant trader or short covering mistaken for accumulation.
3. Historical observations remain reproducible and include unfavorable outcomes.
4. Customers return to saved research workflows and report measurable time saved.
5. Coverage, reliability and cost are measured, with a credible path to serving paying users.

Pilot measurements: research-task completion time, weekly repeat usage, saved cohorts, followed-wallet engagement, alert usefulness/dismissal rate, willingness to pay, source freshness compliance and infrastructure cost per active user. Use opt-in, minimal product analytics; do not expose private research lists.

Set numerical commercial targets after observing a baseline. Do not invent customer counts, revenue, win rates or performance improvements for a demo.

## 17. Ready-to-use team implementation brief

> Read this document and inspect the current working tree before editing. The product is daVIRA, a Hyperliquid-first wallet and market intelligence terminal. Preserve the established theme and real-data behavior. Start with D01–D03 and coordinate with any in-progress positioning-brief or market-history work. Reuse existing flow, coin research, candidate eligibility and risk modules rather than duplicating calculations. Keep observed behavior separate from trade readiness. Missing data must not become zero or a fabricated signal. Every insight needs source time, coverage, method version and drill-down evidence. Implement one bounded milestone, verify it using isolated tests and a production build, then report changed files, checks and limitations. Do not revise the pitch deck, purchase APIs, enable live trading, or introduce a large infrastructure rewrite. Multichain, pre-move and wallet-continuity features follow their explicit gates in this document.

### First review checklist

- [ ] Reconcile this inventory with the latest merged code.
- [ ] Identify in-progress work and agree file ownership before editing.
- [ ] Confirm metric names and timestamps across all pages.
- [ ] Select a bounded coverage target and measure its request/storage budget.
- [ ] Ship useful descriptive insights without weakening setup eligibility.
- [ ] Freeze analytical versions and record forward observations.
- [ ] Choose the next chain only after the core milestone is verified.

---

**Decision:** make the existing wallet intelligence dependable, explainable and historically testable first. Expand into on-chain flows through narrow, auditable adapters. Build the advantage from evidence and workflow quality, not unsupported prediction claims.
