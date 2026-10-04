# Intelligence brief

The brief appears on Summary, Token Lens and the evidence section of Trade Setups. It turns recorded wallet activity into descriptive explanations. It adds no paid API or LLM dependency and does not create forecasts or trade instructions.

## What it explains

- **Participation versus size:** count addresses by the sign of net execution dollars; compare that breadth with the aggregate dollar direction. This is distinct from changes in base-unit position quantity and from current held positions.
- **Largest contributor:** rank by total entry and exit turnover, then remove the largest contributor's executions. A sign reversal means that contributor changes the headline. This calculation is withheld when contributor rows do not reconcile with the full window.
- **Entry versus exit:** buying is new longs plus short covers; selling is new shorts plus long exits. A 40% exit share prompts a composition finding. This threshold is a descriptive rule, not a validated strategy.
- **Time windows:** compare overlapping 1h, 6h and 24h net executions. These are not independent confirmations.
- **Held exposure:** compare fresh sampled long and short notional separately from executed flows. Unknown or old snapshots are not treated as flat. Possible hedges outside the covered accounts remain unobserved.
- **Price alongside flows:** use only continuous, complete hourly candles and executions within the exact same interval. Partial edge hours are excluded. A buying-share imbalance of at least five percentage points and a price move of at least 0.25% permit an opposite-direction description. Neither co-movement nor disagreement establishes causation or future returns.

Effective activity contributors equal `1 / sum(turnover_share^2)`. It measures concentration, not independent owners or bets. Qualification and coverage limits remain visible and inspectable.

## Consistent qualification

Summary/setup votes and Token Lens use `tokenRecordEvidence`: at least 10 completed token episodes, three closing days, token quality at least 60, positive completed-episode PnL, fill retrieval within one hour, zero detected reconstruction gaps and an uncapped latest fill response. Promising historical candidates are reported separately from qualified current records. An excluded incomplete candidate adds an informational warning; it does not veto a sufficiently qualified remaining sample.

These checks do not establish complete historical coverage or future skill. Retention limits, source caps, current-cohort selection and missing observations still matter. Missing data suppresses claims instead of becoming synthetic data.

## Next validation milestones

1. Persist named token cohorts with a creation timestamp, frozen membership/score snapshots and membership changes.
2. Measure results after cohort creation against the tracked universe and comparable random groups; separate this forward record from historical member PnL.
3. Record wallet inactivity, funding and drawdown changes with clear thresholds and hysteresis, preserving an audit trail.
4. Validate historical flow/price pattern estimates on untouched periods before exposing calibrated probabilities or expected moves.

These milestones are planned, not implemented by this brief. Pre-move wallet labels still await the founder's methodology; no transfer is treated as proof that two wallets have the same owner.
