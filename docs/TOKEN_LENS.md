# Token Lens — implementation and statistical boundaries

## Product scope

Token Lens lives on `/coins?coin=ETH` (or another covered market). It combines token-specific records, current covered positions, the collective execution feed, and a market-price/flow timeline. Asset-class Pulse groups observed activity by Crypto, Equity, Index, Commodity, FX, RWA token and unclassified builder markets. Pre-move wallet labels remain reserved for the user's methodology. No new CEX-wallet identity integration or live trading is introduced.

## Reading the chart

24H uses hourly buckets; 7D and 30D use UTC daily buckets. Opened notional is plotted above zero and closed notional below zero. Opening a short is also position inflow. The alternative view plots buys minus sells: new longs + short covers − new shorts − long exits. Market price is a separate axis using completed venue candle closes. Fill price is not substituted for market price. Missing candles remain gaps; a current partial bucket has no completed market close. The first flow bucket excludes executions before the exact rolling-window start. Fills are deduplicated per address, so both tracked counterparties can contribute separately.

## Wallets and positions

Ranks use token-specific completed-episode metrics, not all-wallet PnL. Qualification also requires sufficient episodes/days, positive token PnL, score, fresh uncapped execution history and no detected discontinuities. Position snapshots must be within one hour. A fresh covered snapshot with no position is Flat; an unavailable or old snapshot is Unavailable. Spot and unsupported venues are outside this panel. Current membership is applied to retrospective flows; point-in-time cohort reconstruction is not claimed.

## Historical pattern context

The current feature window is the last six completed hours. Historical reference windows have six hours of inputs followed by six hours of price outcomes and start 12 hours apart. Outcomes must finish before the current input window. Each reference requires continuous candles, at least three wallets, ten executions and four observed execution-hours. These are minimum sample filters, not proof of uninterrupted collection.

Matching tolerances are fixed and visible: buying share ±15 percentage points, net-opening share ±25 points, same-sign six-hour price momentum within two percentage points. At least 30 matching windows spanning 14 UTC dates are required to show summary frequencies. Individual historical examples remain inspectable below this threshold. Summary output includes up/down/flat frequency, median subsequent move, 10th–90th percentiles, overall eligible-window up frequency and a Wilson binomial interval. The interval does not account for all time dependence or selection bias.

These are retrospective frequencies on a selected, incomplete archive. They are **not calibrated forecast probabilities, expected trading returns, causal estimates or evidence of a profitable strategy**. A calibrated probability product would still require point-in-time cohort data, measured coverage, an untouched evaluation period and documented calibration; that validation milestone remains outside this pass.

## Technical context

Requires 21 consecutive completed hourly candles through the latest completed hour. Displays 20-hour SMA, simple 14-period mean true range, RSI calculated from simple 14-period average gains/losses (not Wilder smoothing), and a 20-hour price range. No buy/sell instruction is generated solely from these indicators.

## Focused data collection

Opening Token Lens starts a bounded refresh for the selected market. Up to 40 indexed wallets with token records or observed positions receive account snapshots; up to 20 receive prioritized fresh execution analysis. Refresh requests are coalesced for five minutes. The panel shows real snapshot, analysis and historical-collection progress.

Historical collection pages through `userFillsByTime` for the requested 30-day range, preserving inclusive timestamp boundaries and deduplicating fill IDs. The collector stops on source exhaustion, a stalled timestamp boundary, or six pages. Hyperliquid makes only the latest 10,000 fills accessible, so source exhaustion does not establish complete 30-day coverage. Analysis is rebuilt after new fills arrive. Explicit fresh-analysis requests precede older history pages, and the shared request budget keeps headroom for monitoring. No synthetic fills are added.

The comparison table separately displays new longs, long exits, new shorts and short covers over 1h, 6h, 24h, 7d and 30d. Flow totals use exact rolling windows; price changes use intersecting completed hourly candles. Current positions and window turnover can be used to sort token wallets. The same evidence panel is visible in Trade Setups even when a trade plan is withheld.

[Hyperliquid's official candle API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#candle-snapshot) supports prefixed HIP-3 symbols and up to 5,000 recent candles. Token Lens requests 30 days of hourly candles for the selected supported symbol, caches the response for five minutes, and reserves request budget before fetching. Other data comes from existing local archives and snapshots. No additional paid data service is required.
