# V2 first release — 25 September 2026

## Available locally

- `/coverage`: bounded 20-wallet pilot, freshness and coverage failures, priority overdue counts, queue visibility, 24h measured request success rate and p95 successful-analysis duration, and an exportable collection journal.
- Pilot membership is initialized from demonstrated token records and recently active indexed wallets, then persists. Users can add/remove addresses without deleting their observations. Pilot membership is available as a cohort in Summary and Flows. Historical flow comparisons use current membership, not reconstructed past membership.
- The collector prioritizes watched wallets and the pilot while preserving discovery progress. Explicit research jobs remain first; after four background priority jobs an eligible discovery job gets a turn. Existing upstream rate budgets and request frequency are retained.
- Every analysis attempt records start, finish, outcome, source timestamp, response size, detected discontinuities and cap status. Journal retention is 14 days. No historical attempt metrics are backfilled or fabricated.
- Wallet Performance Lab: 7D/30D rolling windows, per-coin filtering, UTC daily execution PnL, gross/fees/net separation, long/short complete-episode metrics, drawdown and profit factor, sortable coin/asset-class attribution, and JSON export.
- Reconstruction reads up to 30 days of retained fills before filtering episodes by closing time, preserving known openings before a 7D window. Full-episode fees and window execution fees intentionally differ. Funding, unrealized PnL and non-USDC execution fees are outside this lab's scope and disclosed.

## Limits and remaining V2 work

The seven-day reliability study has started, not finished. A fresh snapshot does not certify a complete archive; capped responses and missing intervals remain visible. This release does not implement paginated history recovery, live trade execution, a forward-tested signal record, external notifications, LLM research or multichain indexing. Those remain separate milestones in `V2_EXECUTION_PLAN.md`.

The next priority is bounded gap recovery and continuity measurements for the pilot. Measure the achievable refresh rate and API cost before expanding the cohort or promising a freshness SLA.
