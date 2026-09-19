# Wallet continuity research — proposed, not implemented

Goal: when an observed trader becomes inactive, investigate whether capital moves to another address that subsequently trades. No automated tracking, identity claim or execution is enabled in this release.

1. Establish inactivity from a rolling execution window and verified account snapshots across covered venues. A zero main-DEX balance is insufficient: builder accounts, spot, vaults and account abstraction can explain it.
2. Retrieve supported public non-funding ledger events with explicit pagination and coverage. Distinguish withdrawals, internal transfers, bridges, liquidation and collateral movements. Store transaction identifiers and times.
3. Follow only direct observable destination links. A deposit to an exchange, bridge or shared contract ends reliable attribution; do not infer the next withdrawal is the same person.
4. Observe destination activity and compare tokens, timing and position habits. Label candidates “possible capital continuity,” never “same owner” based on transfers or behavioral resemblance alone.
5. Display the complete evidence path, competing explanations, missing hops, recency and confidence. Let researchers follow an address after review; do not automatically copy trades or merge performance histories.

Future validation: known public transfers, exchange/bridge false-positive fixtures, shared-account cases, inactivity without a transfer, new funded but non-trading accounts, reversible user annotations. Measure precision before marketing this capability.

# Current release additions

- Token-specific rankings use complete observed episodes for each exact instrument, not global wallet profit. The archive is at most 30 days and may be incomplete.
- Active copy shortlist uses explicit funded/fresh/activity/history/profitability/risk/cost gates. No qualifying candidates is a valid result.
- RWA default list requires recently active and verified funded covered accounts. Historical RWA records remain available through the full screener.
- Main and builder account values are displayed separately. Missing data is not zero; venue coverage is incomplete.
- Automatic analysis pool expanded from 80 to 300, with up to 200 leaderboard candidates and up to three recent large participants per streamed market. Worker runs every 12 seconds under the existing weight guard. Indexing is gradual; this is not all-wallet coverage.

API references: [account summaries](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals), [execution history](https://hyperliquid.gitbook.io/Hyperliquid-docs/for-developers/api/info-endpoint), [rate limits](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits).

## Copy eligibility: reported performance gate

The default copy list requires positive source-reported `perpMonth` and `perpAllTime` PnL changes, independently of the reconstructed fill sample. Month samples must span at least 29 days (daily sampling tolerance); the all-time curve must span at least 30 days. Latest curve samples must be within 24 hours and the successful non-stale portfolio fetch within one hour. Missing, malformed, shorter, negative or zero records fail eligibility. Combined/spot performance is not substituted for perpetual performance.

“All-time” is the range returned by Hyperliquid, not verified since wallet creation; a positive total does not establish uninterrupted profitability. Existing trade-count, consistency, drawdown, activity, funding and execution-cost gates still apply. The shortlist no longer has an option that mixes ineligible research wallets into it.

Address lookup on the screener and copy page validates an EVM address, prioritizes Hyperliquid analysis and opens the corresponding research view. It does not place orders. A manually searched address remains eligible for paper investigation even when it is excluded from the copy shortlist; the exclusion reasons are shown.
