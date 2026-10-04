# Trader decision brief

Trade Setups opens on a decision brief, with the market picker alongside it. Trade plan & risk and Data & wallets are separate views. Opening the default brief does not automatically queue a deep wallet backfill; the explicit cohort refresh remains in Token Lens.

The brief answers:

- What is the strongest descriptive finding in the selected window?
- What supports buying, and what shows selling or weakens the buying interpretation?
- How did retained executions change between the two most recent completed six-hour periods?
- Which wallets contribute the most net buying or selling, and what are their current known positions and retained token PnL?
- Which conditions currently support either directional case, and what is missing?
- Have six-month historical comparisons shown a predictive advantage over a baseline?

The initial finding reuses the reconciled execution brief. Two independent exclusion checks remove the largest turnover contributor and the contributor with the largest absolute net flow. A high-turnover trader can have almost flat net executions while a different wallet drives the net direction. The checks require contributor totals to reconcile, and do not establish independent ownership or coordinated intent.

The period comparison uses 12 completed hours split into two adjacent six-hour periods, excluding the ongoing hour. Flows use execution prices. Each period requires at least 10 fills, 3 addresses and activity in 4 hourly buckets before a change interpretation is emitted. These are display sufficiency rules, not guarantees of complete collection. No observed fills means unavailable net flow; missing candles withhold price change. Price change uses the first hourly open and last hourly close in each complete period.

Scenario checks are explicit, unvalidated heuristics: at least 60% of opening notional on a side, at least 60% of directional addresses on that side with the same direction after each of the two separate contributor exclusions, and the latest completed close above/below its 20-hour mean. Price response commentary uses net execution imbalance of at least 10% of turnover (equivalent to buying share at least 55% or at most 45%) and a 0.25% price-change threshold. They never authorize a trade, produce a probability, or bypass the existing setup gates. The 20-hour high/low are observed price references, not assumed support/resistance or stop orders.

Snapshot availability and token-record qualification are displayed separately. Unknown positions are not treated as flat. Token PnL comes from retained complete episodes and excludes funding; no complete episodes produces unavailable PnL, not zero.

Tests cover period boundaries, partial-hour exclusion, duplicate fills, sparse observations, price gaps, contradictory contributors, missing position coverage, unavailable probabilities and stale price checks. Existing setup and position-sizing gates remain in force.
