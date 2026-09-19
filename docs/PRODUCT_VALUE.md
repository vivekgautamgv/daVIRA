# Why a trader would pay for daVIRA

The product sells a faster, repeatable research workflow. Public wallet data itself is not a defensible paid feature. These are hypotheses to validate with early customers, not claims of exclusivity or profitable signals.

## The decisions this version helps with

| Trader question                                         | Implemented answer                                                                              | Evidence and limit                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Where are large wallets adding or closing risk?         | Coin-level position inflow/outflow in four components, with cohort and window controls          | Execution notional, not collateral transfers. Large-wallet criteria are shown.                                                              |
| Is a buy new exposure or an exit?                       | New-long share of buy notional; new-short share of sells                                        | Reversals split into opening and closing legs. Motive cannot be inferred.                                                                   |
| Do multiple wallets agree?                              | One vote per wallet's signed position-size change                                               | Flat round trips are neutral. Wallets may share ownership or hedge elsewhere.                                                               |
| Is one trader creating the apparent signal?             | Largest activity contributor, activity share, and net buy/sell balance with that wallet removed | Removes the most active wallet, not necessarily the largest directional position.                                                           |
| Is activity accelerating?                               | Latest half-window versus previous half-window                                                  | Only wallets whose archived history spans the start are compared; ratio withheld below 70% coverage or zero baseline. Gaps can still exist. |
| Does this wallet have a record in this particular coin? | Coin-level episode performance and quality components                                           | At least five complete episodes for a score; funding excluded.                                                                              |
| Could I reasonably copy this trading style?             | Holding time, execution frequency, maker share and extra-cost stress                            | A research heuristic, not an execution backtest. V1 uses paper trades only.                                                                 |
| Are crypto traders rotating into real-world markets?    | Separate equity/index/commodity/FX exposure, RWA share and builder positions                    | Covered venues only. Governance tokens are distinguished from underlying derivatives.                                                       |

## Proposed free versus $5 Core

**Free discovery:** public leaderboard, basic wallet lookup, current market data and a limited preview of coin flows.

**Core target:** saved research screens, comparisons, detailed wallet attribution, cohort controls, the derived flow research layer, specialization and copying-cost analysis, persistent watchlists and journals.

All local features are open for testing today. This document does not introduce paywalls or imply that a paid service exists. Customer authentication, per-user data isolation, billing, hosted reliability and quota enforcement must precede a paid launch.

## What makes the workflow worth testing

The differentiator is the combination of evidence in one place: a coin flow links to contributing wallets, their asset-specific records, and the execution cost of following them. A trader can reproduce the reasoning instead of relying on a black-box score. Competitors may offer overlapping features; uniqueness has not been established through a comprehensive market audit.

For an early pilot, ask customers to complete three real research tasks: identify a meaningful exposure change, reject a misleading aggregate, and evaluate a copy candidate. Record time saved, which views they revisit, what they export, and whether they return the following week. Do not use portfolio profit as proof that the product caused a successful trade.

## Next priorities after local validation

1. Improve archival continuity and expose per-wallet history gaps before expanding the universe.
2. Add saved cohort-specific alerts for material flow changes, with deduplication and user-controlled thresholds.
3. Build point-in-time cohort snapshots for forward evaluation without selecting today's winners after the fact.
4. Measure processing and storage cost per active customer; share market ingestion across tenants, isolate private workspace data.
5. Add hosted customer accounts and billing only after reliability and retention justify the $5 offer.

Front-running detection remains deferred pending supplied wallets and methodology. Multi-chain identity labels, private CEX wallet attribution and guaranteed predictive advantage are not implemented.
