# daVIRA V2 — evidence before expansion

25 September 2026. Product/engineering plan; no pitch changes.

## Release starting point

The current release adds observable coin behavior separately from trade readiness, four execution buckets, wallet breadth and concentration, collection diagnostics, and local price/OI snapshots. Wallet profiles add sortable PnL attribution by coin and asset type. These additions are descriptive research, not validated predictions.

An initial diagnostic found only 9 of 301 wallet analyses fresh within one hour and five token records passing specialist-history thresholds. These are a point-in-time observation, not permanent system totals. The next release must improve data continuity before advertising broader coverage.

## Recommended order

| Milestone | Build | Release gate |
|---|---|---|
| 1. Reliable research universe | Fixed pilot cohort; per-wallet coverage windows; scheduled refresh budgets; paginated gap repair where upstream history permits; explicit unavailable windows; collection SLO dashboard | Seven days of measured collection; demonstrate replay deduplication, gap reporting and a successful backup restore; report observed latency percentiles |
| 2. Wallet and token attribution | 7D/30D observed PnL, realized versus unrealized, fees/funding reconciliation where available, token skill versus turnover specialization, long/short results, profitable-day consistency and concentration | PnL reconciles to source fills; exclude incomplete episodes from win rate; never substitute unavailable history with zero |
| 3. Coin research desk | Persistence over successive windows, historical cohort membership, specialists versus other wallets, funding percentiles, price/OI divergence, liquidity and liquidation-distance context | Comparable windows and adequate baselines; every conclusion links to timestamped observations; avoid treating sampled liquidation levels as a complete heatmap |
| 4. Measured signal record | Immutable timestamped thesis, input cohort, invalidation, expiry and rule version; forward outcome tracking; delayed copy simulation with fees, funding and slippage | Include every eligible signal and every expired/failed outcome; split calibration and forward evaluation periods; compare with simple baselines; publish sample size, drawdown and uncertainty |
| 5. Research workflow | Saved coin desks, meaningful-change alerts, daily watchlist digest, replayable evidence and exports; prompt interface over audited analytics tools | Alerts deduplicate/recover after restart; show delivery latency; LLM answers cite computed data and never invent a wallet label or trade |
| 6. Narrow on-chain expansion | One chain and a small labeled entity set; exchange/bridge counterparties, token holdings changes and observable transfer paths | Validate address labels and licensing, track provenance, handle reorgs and internal transfers; separate transfer observations from inferred intent or common ownership |

Milestones 1–4 are the core V2. Milestones 5–6 expand it after quality and cost measurements. Keep pre-move research behind the user's pending methodology; wallet migration remains a research hypothesis until independently supported. No automatic live trading in this scope.

## Sources and integration boundaries

- [Hyperliquid asset contexts](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals) expose mark price, funding and open interest. Reuse the existing requests and retain snapshots; local history cannot be backfilled by pretending current OI is historical OI.
- [Nansen Smart Money netflows](https://docs.nansen.ai/api/smart-money/netflows) is a reference for cohort-based token-flow research. On-chain token transfers and perpetual position notional are distinct measurements. A Nansen integration requires evaluating access, terms and cost; their labels are not assumed to be an open database.
- [Arkham's official product guide](https://info.arkm.com/research/how-to-use-arkham-intel-guide-explained) describes entity research, transaction visualization and alerts. Use these as workflow references; do not claim a transfer proves that two wallets share an owner or that a destination will sell.

## What would strengthen the pre-seed case

Build a narrow, demonstrably reliable product before promising complete crypto intelligence. Demonstrate source-linked research, repeat usage from pilot traders, measured time saved, willingness to pay at the $10 target, and collection/serving cost per active user. Publish signal evaluation honestly, including weak or null results. Feature count by itself does not establish investment readiness.

## Immediate next implementation

Start with a bounded pilot cohort and a coverage dashboard, then reconcile coin-level performance over comparable windows. Preserve raw source timestamps and versions. Run a seven-day collection study to measure which wallets can be monitored reliably within the free request budget. Use the results to set refresh tiers instead of claiming that every indexed wallet is live.
